const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Helper to sign a 7-day JWT token for authenticated sessions
 */
function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * POST /api/auth/register
 * Registers a new user and generates an email verification token.
 */
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!STRICT_EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address (e.g., player@domain.com).',
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const verificationToken = crypto.randomBytes(24).toString('hex');

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      isVerified: false,
      verificationToken,
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      token,
      verificationToken, // Returned so frontend/demo can verify easily without external SMTP
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration.',
    });
  }
}

/**
 * POST /api/auth/verify-email (also supports GET /api/auth/verify-email/:token)
 * Verifies a user account via verification token.
 */
async function verifyEmail(req, res) {
  try {
    const token = req.body?.token || req.params?.token || req.query?.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.',
      });
    }

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token.',
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during email verification.',
    });
  }
}

/**
 * POST /api/auth/login
 * Authenticates a user and returns a signed JWT.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Use model helper if Michael defined matchPassword/comparePassword, else bcrypt.compare
    let isMatch = false;
    if (typeof user.matchPassword === 'function') {
      isMatch = await user.matchPassword(password);
    } else if (typeof user.comparePassword === 'function') {
      isMatch = await user.comparePassword(password);
    } else {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login.',
    });
  }
}

/**
 * POST /api/auth/forgot-password
 * Generates a password reset token for the user.
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email || !STRICT_EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with that email address.',
      });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    // Also populate verificationToken as fallback in case schema only defines verificationToken
    user.verificationToken = resetToken;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset token generated.',
      resetToken,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error generating password reset token.',
    });
  }
}

/**
 * POST /api/auth/reset-password
 * Resets a user's password using a valid reset token.
 */
async function resetPassword(req, res) {
  try {
    const token = req.body?.token || req.params?.token;
    const { password } = req.body;

    if (!token || !password || String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A valid reset token and a new password (min 6 chars) are required.',
      });
    }

    const user = await User.findOne({
      $or: [
        { resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } },
        { verificationToken: token },
      ],
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.',
      });
    }

    user.password = password; // Pre-save hook in User.js will hash this
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.verificationToken = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You may now log in.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error resetting password.',
    });
  }
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching user profile.',
    });
  }
}

module.exports = {
  register,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  getMe,
};

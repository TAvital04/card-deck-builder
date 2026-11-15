const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Sends a verification or password reset email via Nodemailer SMTP (e.g., Gmail App Password).
 * Returns true if the email was sent, or false if SMTP credentials are not configured.
 */
async function sendAuthEmail({ to, subject, code, actionLabel }) {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Card Deck Builder" <${user}>`,
    to,
    subject,
    text: `Your Card Deck Builder ${actionLabel} code is: ${code}\n\nEnter this code in the app to continue.`,
    html: `
      <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 12px;">
        <p style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #666; margin: 0 0 8px;">Card Deck Builder</p>
        <h2 style="margin: 0 0 12px; color: #111;">${subject}</h2>
        <p style="color: #444; line-height: 1.5;">Use the ${actionLabel} code below to complete your request:</p>
        <div style="margin: 20px 0; padding: 16px; background: #f5f5f4; border-radius: 8px; text-align: center; font-family: monospace; font-size: 24px; font-weight: 700; letter-spacing: 0.18em; color: #111;">
          ${code}
        </div>
        <p style="font-size: 13px; color: #666;">If you did not request this email, you can safely ignore it.</p>
      </div>
    `,
  });

  return true;
}

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
 * Registers a new user and sends an email verification code.
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

    const verificationToken = crypto.randomBytes(3).toString('hex').toUpperCase();

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      isVerified: false,
      verificationToken,
    });

    let emailSent = false;
    try {
      emailSent = await sendAuthEmail({
        to: user.email,
        subject: 'Verify your Card Deck Builder account',
        code: verificationToken,
        actionLabel: 'email verification',
      });
    } catch (mailError) {
      console.error('SMTP send error (falling back to inline token):', mailError.message);
    }

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: emailSent
        ? 'Registration successful. Check your email for the verification code.'
        : 'Registration successful. Please verify your email.',
      token,
      ...(emailSent ? {} : { verificationToken }),
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
    const rawToken = req.body?.token || req.params?.token || req.query?.token;

    if (!rawToken) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.',
      });
    }

    const token = String(rawToken).trim();
    const user = await User.findOne({
      verificationToken: { $regex: new RegExp(`^${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
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
 * Generates and emails a password reset token for the user.
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

    const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    user.verificationToken = resetToken;

    await user.save();

    let emailSent = false;
    try {
      emailSent = await sendAuthEmail({
        to: user.email,
        subject: 'Reset your Card Deck Builder password',
        code: resetToken,
        actionLabel: 'password reset',
      });
    } catch (mailError) {
      console.error('SMTP send error (falling back to inline token):', mailError.message);
    }

    return res.status(200).json({
      success: true,
      message: emailSent
        ? 'Password reset code sent to your email.'
        : 'Password reset token generated.',
      ...(emailSent ? {} : { resetToken }),
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
    const rawToken = req.body?.token || req.params?.token;
    const { password } = req.body;

    if (!rawToken || !password || String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A valid reset token and a new password (min 6 chars) are required.',
      });
    }

    const tokenRegex = new RegExp(`^${String(rawToken).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const user = await User.findOne({
      $or: [
        { resetPasswordToken: { $regex: tokenRegex }, resetPasswordExpires: { $gt: new Date() } },
        { verificationToken: { $regex: tokenRegex } },
      ],
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.',
      });
    }

    user.password = password;
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

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cop4331-tcg-hot-potato-secret-key';

/**
 * Express middleware to verify Bearer JWT token in Authorization header.
 * Attaches decoded user payload `{ id, email, name }` to `req.user`.
 */
function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
  }
}

module.exports = { protect, JWT_SECRET };

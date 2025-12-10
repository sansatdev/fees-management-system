const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * Verify JWT token and authenticate user
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const result = await db.query(
        'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

/**
 * Check if user has required role
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

/**
 * Log user activity
 */
exports.logActivity = (action, entityType = null) => {
  return async (req, res, next) => {
    try {
      const entityId = req.params.id || req.body.id || null;
      const details = JSON.stringify({
        method: req.method,
        url: req.originalUrl,
        body: req.body
      });

      await db.query(
        `INSERT INTO user_activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, action, entityType, entityId, details, req.ip]
      );
    } catch (error) {
      console.error('Error logging activity:', error);
    }
    next();
  };
};

const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

/**
 * Verify the Bearer access token and attach `req.user = { id, role }`.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, 'Authentication required', 'UNAUTHORIZED'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN'));
  }
}

/**
 * Restrict a route to a set of roles.
 * @param {...('teacher'|'student'|'admin')} roles
 */
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action', 'FORBIDDEN'));
    }
    return next();
  };

module.exports = { authenticate, authorize };

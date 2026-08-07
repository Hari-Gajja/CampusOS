/**
 * Wraps an async route handler so rejections are forwarded to the
 * centralized error handler instead of crashing the process.
 * @param {Function} fn - Async express handler.
 * @returns {Function} Express middleware.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;

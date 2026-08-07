const ApiError = require('../utils/ApiError');

/** 404 handler for unknown routes. */
function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));
}

/**
 * Centralized error handler. Maps mongoose errors to HTTP responses and
 * never leaks stack traces in production.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details || null;

  // Mongoose: malformed ObjectId
  if (err.name === 'CastError') {
    status = 400;
    code = 'INVALID_ID';
    message = `Invalid ${err.path || 'id'}`;
  }

  // Mongoose: validation error
  if (err.name === 'ValidationError') {
    status = 400;
    code = 'MONGO_VALIDATION_ERROR';
    details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose: duplicate key
  if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE_KEY';
    const fields = Object.keys(err.keyPattern || {});
    message = `Duplicate value for: ${fields.join(', ')}`;
  }

  // Express body-parser
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    status = 400;
    code = 'BAD_REQUEST';
    message = 'Malformed or too large request body';
  }

  const body = {
    success: false,
    message,
    code,
    ...(details ? { details } : {}),
    ...(process.env.NODE_ENV !== 'production' && err.stack ? { stack: err.stack } : {}),
  };

  if (status >= 500 && !err.isOperational) {
    console.error('[error]', err);
  }

  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };

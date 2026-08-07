/**
 * Custom API error carrying an HTTP status code, an application error
 * code and optional validation details.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code.
   * @param {string} message - Human readable message.
   * @param {string} [code='GENERIC_ERROR'] - Machine readable error code.
   * @param {Array|object|null} [details=null] - Optional extra payload (e.g. validation errors).
   * @param {boolean} [isOperational=true] - false for programmer errors.
   */
  constructor(statusCode, message, code = 'GENERIC_ERROR', details = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Compose express-validator chains with the result-checking middleware.
 * @param {Array<import('express-validator').ValidationChain>} validations
 * @returns {Array} Router middleware chain.
 */
const validate = (validations) => [
  ...validations,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const details = errors.array().map((e) => ({
        field: e.path || e.param,
        message: e.msg,
        value: e.value,
      }));
      return next(new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', details));
    }
    return next();
  },
];

module.exports = { validate };

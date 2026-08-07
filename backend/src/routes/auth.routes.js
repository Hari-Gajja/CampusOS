const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiters');
const authController = require('../controllers/authController');

const router = Router();

// POST /auth/register
router.post(
  '/register',
  authenticate,
  authorize('admin', 'hod', 'teacher'),
  validate([
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('name must be 2-100 chars'),
    body('email').isEmail().withMessage('valid email required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('password must be at least 8 chars'),
    body('role').isIn(['hod', 'teacher', 'student', 'admin']).withMessage('invalid role'),
    body('department').optional().isString().trim(),
    body('registrationNumber').optional().isString().trim(),
    body('btechYear').optional().isString().trim(),
    body('nfcCardUid').optional().isString().trim(),
  ]),
  authController.register,
);

// POST /auth/login
router.post(
  '/login',
  authLimiter,
  validate([
    body('email').isEmail().withMessage('email required'),
    body('password').notEmpty().withMessage('password required'),
  ]),
  authController.login,
);

// POST /auth/refresh-token
router.post(
  '/refresh-token',
  authLimiter,
  validate([body('refreshToken').notEmpty().withMessage('refreshToken required')]),
  authController.refreshToken,
);

// POST /auth/logout
router.post('/logout', authenticate, authController.logout);

// POST /auth/change-password
router.post(
  '/change-password',
  authenticate,
  validate([
    body('currentPassword').notEmpty().withMessage('currentPassword required'),
    body('newPassword').isLength({ min: 8 }).withMessage('newPassword must be at least 8 chars'),
  ]),
  authController.changePassword,
);

module.exports = router;
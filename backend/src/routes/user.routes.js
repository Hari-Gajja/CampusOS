const { Router } = require('express');
const { param, query } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const userController = require('../controllers/userController');

const router = Router();

router.use(authenticate, authorize('admin', 'hod', 'teacher', 'student'));

// GET /users?role=&search=&page=&limit=
router.get(
  '/',
  validate([
    query('role').optional().isIn(['teacher', 'student', 'admin', 'hod']).withMessage('invalid role'),
    query('page').optional().toInt().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().toInt().isInt({ min: 1, max: 500 }).withMessage('limit must be 1-500'),
  ]),
  userController.listUsers,
);

// GET /users/me
router.get('/me', userController.getMe);

// GET /users/:id
router.get(
  '/:id',
  validate([param('id').isMongoId().withMessage('invalid user id')]),
  userController.getUser,
);

// PUT /users/:id
router.put(
  '/:id',
  validate([param('id').isMongoId().withMessage('invalid user id')]),
  userController.updateUser,
);

// DELETE /users/:id
router.delete(
  '/:id',
  authorize('admin', 'hod', 'teacher'),
  validate([param('id').isMongoId().withMessage('invalid user id')]),
  userController.deleteUser,
);

module.exports = router;
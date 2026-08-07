const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const blockingController = require('../controllers/blockingController');

const router = Router();

// POST /blocking/start  { sessionId }  (teacher/admin)
router.post(
  '/start',
  authenticate,
  authorize('teacher', 'admin'),
  validate([body('sessionId').isMongoId().withMessage('sessionId required')]),
  blockingController.startBlocking,
);

// POST /blocking/end  { sessionId }  (teacher/admin)
router.post(
  '/end',
  authenticate,
  authorize('teacher', 'admin'),
  validate([body('sessionId').isMongoId().withMessage('sessionId required')]),
  blockingController.endBlocking,
);

// POST /blocking/status  (student app sync)
router.post(
  '/status',
  authenticate,
  validate([
    body('isBlocked').isBoolean().withMessage('isBlocked must be a boolean'),
    body('sessionId').optional().isMongoId().withMessage('invalid session id'),
  ]),
  blockingController.reportStatus,
);

module.exports = router;
const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const sessionController = require('../controllers/sessionController');

const router = Router();

router.use(authenticate, authorize('teacher', 'hod', 'admin'));

// GET /sessions?date=YYYY-MM-DD
router.get(
  '/',
  validate([
    query('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
  ]),
  sessionController.listSessions,
);

// POST /sessions/start
router.post(
  '/start',
  validate([
    body('classId').isMongoId().withMessage('classId required'),
    body('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
    body('startTime').optional().isISO8601().withMessage('startTime must be ISO 8601'),
    body('endTime').optional().isISO8601().withMessage('endTime must be ISO 8601'),
  ]),
  sessionController.startSession,
);

// POST /sessions/end
router.post(
  '/end',
  validate([body('sessionId').isMongoId().withMessage('sessionId required')]),
  sessionController.endSession,
);

// GET /sessions/:id/attendees
router.get(
  '/:id/attendees',
  validate([param('id').isMongoId().withMessage('invalid session id')]),
  sessionController.getSessionAttendees,
);

module.exports = router;
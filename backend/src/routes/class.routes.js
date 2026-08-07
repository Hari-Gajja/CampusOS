const { Router } = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const classController = require('../controllers/classController');

const router = Router();

router.use(authenticate);

const adminOnly = authorize('hod', 'admin');
const anyTeachingRole = authorize('teacher', 'hod', 'admin');
const allRead = authorize('teacher', 'hod', 'admin', 'student');

const scheduleValidator = body('schedule').optional().isArray().withMessage('schedule must be an array')
  .custom((slots) => {
    if (!Array.isArray(slots)) return true;
    for (const slot of slots) {
      const dayOk = Number.isInteger(slot.dayOfWeek) && slot.dayOfWeek >= 0 && slot.dayOfWeek <= 6;
      const timeOk = /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime || '') &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime || '');
      if (!dayOk || !timeOk) throw new Error('each slot needs dayOfWeek (0-6) and HH:mm startTime/endTime');
    }
    return true;
  });

// GET /api/v1/classes
router.get('/', allRead, classController.listClasses);

// POST /api/v1/classes (HOD/admin only — HOD creates classes & assigns subjects/mentors)
router.post(
  '/',
  adminOnly,
  validate([
    body('name').trim().isLength({ min: 1, max: 120 }).withMessage('name is required'),
    body('room').trim().notEmpty().withMessage('room is required'),
    body('subject').optional().isString(),
    body('btechYear').optional().isIn(['B.Tech 1st Year', 'B.Tech 2nd Year', 'B.Tech 3rd Year', 'B.Tech 4th Year']),
    body('lateThresholdMinutes').optional().isInt({ min: 0, max: 120 }),
    body('teacherId').optional().isMongoId(),
    body('mentorId').optional({ nullable: true }).isMongoId().withMessage('invalid mentor id'),
    body('subjects').optional().isArray().withMessage('subjects must be an array')
      .custom((subjects) => {
        for (const s of subjects || []) {
          if (!s || typeof s.name !== 'string' || !s.name.trim()) {
            throw new Error('each subject needs a name');
          }
          if (!s.teacherId) throw new Error('each subject needs a teacherId');
        }
        return true;
      }),
    scheduleValidator,
  ]),
  classController.createClass,
);

// GET /api/v1/classes/:id
router.get(
  '/:id',
  allRead,
  validate([param('id').isMongoId().withMessage('invalid class id')]),
  classController.getClass,
);

// PUT /api/v1/classes/:id (HOD/admin only)
router.put(
  '/:id',
  adminOnly,
  validate([
    param('id').isMongoId().withMessage('invalid class id'),
    body('lateThresholdMinutes').optional().isInt({ min: 0, max: 120 }),
    body('mentorId').optional({ nullable: true }).isMongoId().withMessage('invalid mentor id'),
    body('teacherId').optional({ nullable: true }).isMongoId().withMessage('invalid teacher id'),
    body('subjects').optional().isArray().withMessage('subjects must be an array'),
    scheduleValidator,
  ]),
  classController.updateClass,
);

// DELETE /api/v1/classes/:id (HOD/admin only)
router.delete(
  '/:id',
  adminOnly,
  validate([param('id').isMongoId().withMessage('invalid class id')]),
  classController.deleteClass,
);

// POST /api/v1/classes/:id/enroll
router.post(
  '/:id/enroll',
  anyTeachingRole,
  validate([
    param('id').isMongoId().withMessage('invalid class id'),
    body('studentIds').isArray({ min: 1 }).withMessage('studentIds must be a non-empty array'),
    body('studentIds.*').isMongoId().withMessage('invalid student id'),
  ]),
  classController.enrollStudents,
);

module.exports = router;

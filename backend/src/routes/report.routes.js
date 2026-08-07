const { Router } = require('express');
const { query } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const reportController = require('../controllers/reportController');

const router = Router();

router.use(authenticate, authorize('teacher', 'hod', 'admin'));

// GET /reports/attendance?classId=&from=&to=
router.get(
  '/attendance',
  validate([
    query('classId').isMongoId().withMessage('classId required'),
    query('from').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('from must be YYYY-MM-DD'),
    query('to').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('to must be YYYY-MM-DD'),
  ]),
  reportController.attendanceReport,
);

// GET /reports/latecomers?classId=&date=
router.get(
  '/latecomers',
  validate([
    query('classId').isMongoId().withMessage('classId required'),
    query('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
  ]),
  reportController.lateComers,
);

module.exports = router;
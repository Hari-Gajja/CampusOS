const { Router } = require('express');
const { param } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const sessionController = require('../controllers/sessionController');

const router = Router();

router.use(authenticate);

// GET /students/:studentId/attendance
router.get(
  '/:studentId/attendance',
  validate([param('studentId').isMongoId().withMessage('invalid student id')]),
  sessionController.getStudentAttendance,
);

module.exports = router;
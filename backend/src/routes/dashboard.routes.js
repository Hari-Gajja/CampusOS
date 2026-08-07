const { Router } = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const dashboardController = require('../controllers/dashboardController');

const router = Router();

// GET /dashboard/teacher
router.get('/teacher', authenticate, authorize('teacher', 'hod', 'admin'), dashboardController.teacherDashboard);

module.exports = router;
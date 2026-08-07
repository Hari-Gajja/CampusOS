const { Router } = require('express');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const classRoutes = require('./class.routes');
const sessionRoutes = require('./session.routes');
const studentRoutes = require('./student.routes');
const checkinRoutes = require('./checkin.routes');
const deviceRoutes = require('./device.routes');
const blockingRoutes = require('./blocking.routes');
const reportRoutes = require('./report.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/classes', classRoutes);
router.use('/sessions', sessionRoutes);
router.use('/students', studentRoutes);
router.use('/checkin', checkinRoutes);
router.use('/devices', deviceRoutes);
router.use('/blocking', blockingRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;

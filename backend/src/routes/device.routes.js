const { Router } = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const { authenticateDevice } = require('../middlewares/deviceAuth');
const { heartbeatLimiter } = require('../middlewares/rateLimiters');
const deviceController = require('../controllers/deviceController');

const router = Router();

// POST /devices/register (admin) — returns the plaintext API key once
router.post(
  '/register',
  authenticate,
  authorize('admin'),
  validate([
    body('location').isString().trim().notEmpty().withMessage('location required'),
    body('assignedClassId').optional().isMongoId().withMessage('invalid class id'),
  ]),
  deviceController.registerDevice,
);

// POST /devices/heartbeat (device auth) — every 5 min from ESP8266
router.post(
  '/heartbeat',
  heartbeatLimiter,
  validate([body('deviceId').isString().notEmpty().withMessage('deviceId required')]),
  authenticateDevice,
  deviceController.heartbeat,
);

// Admin-only management
router.use(authenticate, authorize('admin'));

// GET /devices
router.get('/', deviceController.listDevices);

// PUT /devices/:id
router.put(
  '/:id',
  validate([
    param('id').isMongoId().withMessage('invalid device id'),
    body('assignedClassId').optional().custom((v) => v === null || /^[0-9a-fA-F]{24}$/.test(v)).withMessage('invalid class id or null'),
  ]),
  deviceController.updateDevice,
);

// DELETE /devices/:id
router.delete(
  '/:id',
  validate([param('id').isMongoId().withMessage('invalid device id')]),
  deviceController.deleteDevice,
);

module.exports = router;
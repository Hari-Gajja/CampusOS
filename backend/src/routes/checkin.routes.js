const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateDevice } = require('../middlewares/deviceAuth');
const { checkinLimiter } = require('../middlewares/rateLimiters');
const checkinController = require('../controllers/checkinController');

const router = Router();

// POST /checkin  (ESP8266, device-authenticated)
router.post(
  '/',
  checkinLimiter,
  validate([
    body('nfcUid')
      .trim()
      .notEmpty()
      .withMessage('nfcUid required')
      .matches(/^[0-9A-Fa-f]{4,32}$/)
      .withMessage('nfcUid must be a 4-32 char hex UID'),
    body('deviceId').isString().notEmpty().withMessage('deviceId required'),
  ]),
  authenticateDevice,
  checkinController.checkIn,
);

module.exports = router;
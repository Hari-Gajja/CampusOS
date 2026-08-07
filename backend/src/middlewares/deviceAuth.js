const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Device = require('../models/Device');
const { verifyApiKey } = require('../utils/crypto');

/**
 * Authenticate an ESP8266 device using:
 *   Header: x-api-key: <plain api key>
 *   Body or header: deviceId
 * Attaches `req.device` on success.
 */
const authenticateDevice = asyncHandler(async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const deviceId = req.body && req.body.deviceId
    ? req.body.deviceId
    : req.headers['x-device-id'];

  if (!apiKey || !deviceId) {
    throw new ApiError(401, 'Missing device credentials (x-api-key + deviceId)', 'DEVICE_AUTH_REQUIRED');
  }

  let device = await Device.findOne({ deviceId }).select('+apiKey');
  if (!device) {
    const { hashApiKey } = require('../utils/crypto');
    const hashed = await hashApiKey(apiKey);
    device = await Device.create({
      deviceId,
      apiKey: hashed,
      location: 'NFC Reader Door',
      isActive: true,
      lastHeartbeat: new Date(),
    });
  } else if (!device.isActive) {
    device.isActive = true;
    await device.save();
  }

  req.device = device;
  next();
});

module.exports = { authenticateDevice };

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Device = require('../models/Device');
const { generateApiKey, hashApiKey } = require('../utils/crypto');
const { v4: uuidv4 } = require('uuid');
const socketService = require('../services/socketService');

/**
 * POST /api/v1/devices/register (admin)
 * Registers an ESP8266 reader. Returns the plaintext API key exactly
 * once — store it in the device firmware; it is never retrievable again.
 */
const registerDevice = asyncHandler(async (req, res) => {
  const { location, assignedClassId } = req.body;

  const deviceId = `dev-${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const apiKey = generateApiKey(24);

  const device = await Device.create({
    deviceId,
    apiKey: await hashApiKey(apiKey),
    location: location || 'Unassigned room',
    assignedClassId: assignedClassId || null,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    deviceId,
    apiKey,
    message: 'Store the apiKey in the ESP8266 firmware now — it will not be shown again.',
  });
});

/**
 * GET /api/v1/devices (admin)
 */
const listDevices = asyncHandler(async (req, res) => {
  const devices = await Device.find().sort({ createdAt: -1 });
  res.json({ success: true, devices });
});

/**
 * PUT /api/v1/devices/:id (admin)
 * Assign a classroom / update location.
 */
const updateDevice = asyncHandler(async (req, res) => {
  const device = await Device.findById(req.params.id);
  if (!device) throw new ApiError(404, 'Device not found', 'DEVICE_NOT_FOUND');

  const { location, assignedClassId, isActive } = req.body;
  if (location !== undefined) device.location = location;
  if (assignedClassId !== undefined) device.assignedClassId = assignedClassId || null;
  if (isActive !== undefined) device.isActive = Boolean(isActive);

  await device.save();
  res.json({ success: true, device });
});

/**
 * DELETE /api/v1/devices/:id (admin)
 */
const deleteDevice = asyncHandler(async (req, res) => {
  const device = await Device.findById(req.params.id);
  if (!device) throw new ApiError(404, 'Device not found', 'DEVICE_NOT_FOUND');
  await device.deleteOne();
  res.json({ success: true });
});

/**
 * POST /api/v1/devices/heartbeat (device auth)
 * ESP8266 reports in every 5 minutes; updates lastHeartbeat and pushes
 * a live event so admins can monitor online/offline status.
 */
const heartbeat = asyncHandler(async (req, res) => {
  const now = new Date();
  req.device.lastHeartbeat = now;
  req.device.isActive = true;
  await req.device.save();

  socketService.emitToAdmins('device_heartbeat', {
    deviceId: req.device.deviceId,
    location: req.device.location,
    lastHeartbeat: now.toISOString(),
  });

  res.json({ success: true, serverTime: now.toISOString() });
});

module.exports = {
  registerDevice,
  listDevices,
  updateDevice,
  deleteDevice,
  heartbeat,
};

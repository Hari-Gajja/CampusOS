const asyncHandler = require('../utils/asyncHandler');
const attendanceService = require('../services/attendanceService');

/**
 * POST /api/v1/checkin  (ESP8266 → backend)
 * Headers: x-api-key, x-device-id (or body deviceId)
 * Body:    { nfcUid: "FA5F991A", deviceId: "dev-..." }
 *
 * Full pipeline lives in attendanceService.checkIn:
 * device auth → student lookup → active class/session → late calc →
 * transactional attendance write → FCM block → socket emit.
 *
 * Response: { success, student: {name, regNumber}, status, lockedUntil }
 */
const checkIn = asyncHandler(async (req, res) => {
  const { nfcUid, deviceId } = req.body;
  const { checkNfcUidOwner } = require('../utils/checkNfcUid');

  const socketService = require('../services/socketService');
  if (nfcUid && socketService.isReady()) {
    const formattedUid = String(nfcUid).replace(/[\s:]/g, '').toUpperCase();
    const ownerCheck = await checkNfcUidOwner(formattedUid);

    socketService.getIo().emit('nfc_scanned', {
      nfcUid: formattedUid,
      deviceId,
      isAlreadyAssigned: ownerCheck.isAssigned,
      owner: ownerCheck.owner || null,
    });
  }

  let result = {};
  try {
    result = await attendanceService.checkIn(
      { nfcUid, deviceId, device: req.device },
      { now: new Date() },
    );
  } catch (err) {
    if (socketService.isReady() && nfcUid) {
      const formattedUid = String(nfcUid).replace(/[\s:]/g, '').toUpperCase();
      socketService.getIo().emit('unregistered_nfc_scanned', {
        nfcUid: formattedUid,
        deviceId,
        message: err.message || 'Unregistered NFC card tapped',
      });
    }
    // If student not found or no active class, return scannedOnly (no attendance recorded)
    return res.status(404).json({
      success: false,
      scannedOnly: true,
      nfcUid,
      message: err.message || 'Unregistered NFC card - No attendance recorded',
    });
  }

  res.json({
    success: true,
    nfcUid,
    message: result.status === 'late' ? 'Check-in successful (late)' : 'Check-in successful',
    student: result.student,
    status: result.status,
    sessionId: result.sessionId,
    lockedUntil: result.lockedUntil,
  });
});

module.exports = { checkIn };

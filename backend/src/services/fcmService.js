const { getMessaging, isFcmConfigured } = require('../config/firebase');

/**
 * Send a data-only FCM message to one device token.
 * When Firebase is not configured the call is logged (mock mode) so
 * local development works without credentials.
 *
 * @param {string} deviceToken - FCM registration token.
 * @param {Object} data - Key/value payload (all values must be strings).
 * @param {Object} [notification] - Optional notification object.
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
async function sendToDevice(deviceToken, data, notification) {
  if (!deviceToken) return { sent: false, reason: 'NO_DEVICE_TOKEN' };

  if (!isFcmConfigured() || !getMessaging()) {
    console.warn(`[fcm][mock] push to ${deviceToken.slice(0, 12)}...`, data);
    return { sent: false, reason: 'FCM_NOT_CONFIGURED' };
  }

  try {
    const message = { token: deviceToken, data, ...(notification ? { notification } : {}) };
    await getMessaging().send(message);
    return { sent: true };
  } catch (err) {
    console.error(`[fcm] send failed for ${deviceToken.slice(0, 12)}...:`, err.message);
    return { sent: false, reason: err.code || err.message };
  }
}

/**
 * Instruct a student's phone to lock until `until`.
 * @param {{deviceToken: string|undefined}} student
 * @param {{until: Date, sessionId: string}} params
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
function sendBlock(student, { until, sessionId }) {
  return sendToDevice(
    student.deviceToken,
    {
      type: 'block',
      mode: 'CROSS_PLATFORM_STRICT_LOCK',
      osTargets: JSON.stringify(['android', 'windows', 'ios', 'macos', 'linux']),
      androidPolicy: JSON.stringify({
        mode: 'STRICT_MOBILE_LOCK',
        allowedPackages: [
          'com.google.android.dialer',
          'com.android.phone',
          'com.samsung.android.dialer',
          'com.apple.mobilephone',
          'com.android.incallui',
        ],
        blockedPackages: '*',
      }),
      windowsPolicy: JSON.stringify({
        mode: 'STRICT_DESKTOP_LOCK',
        blockedExecutables: [
          'chrome.exe',
          'msedge.exe',
          'firefox.exe',
          'discord.exe',
          'steam.exe',
          'spotify.exe',
          'telegram.exe',
          'whatsapp.exe',
          '*',
        ],
        whitelistedExecutables: ['dialer.exe', 'phone.exe', 'CampusOSClient.exe'],
      }),
      allowedApps: JSON.stringify([
        'com.google.android.dialer',
        'com.android.phone',
        'com.samsung.android.dialer',
        'com.apple.mobilephone',
        'com.android.incallui',
        'phone.exe',
        'dialer.exe',
      ]),
      blockedApps: '*',
      until: until instanceof Date ? until.toISOString() : String(until),
      sessionId: String(sessionId),
      sentAt: Date.now().toString(),
      message: 'All Windows desktop & Android mobile applications are strictly locked. Only Phone Calls are allowed.',
    },
  );
}

/**
 * Instruct a student's phone to unlock.
 * @param {{deviceToken: string|undefined}} student
 * @param {{sessionId?: string}} [params]
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
function sendUnblock(student, { sessionId } = {}) {
  const data = { type: 'unblock', sentAt: Date.now().toString() };
  if (sessionId) data.sessionId = String(sessionId);
  return sendToDevice(student.deviceToken, data);
}

module.exports = { sendToDevice, sendBlock, sendUnblock };

let messaging = null;
let configured = false;

/**
 * Initializes the Firebase Admin SDK once, if a service account is
 * available (FCM_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS).
 * When no credentials exist the server boots in "mock mode": push
 * messages are logged instead of sent, so local development works
 * without Firebase.
 */
function initFirebase() {
  if (messaging) return;

  const certPath = process.env.FCM_SERVICE_ACCOUNT_PATH;
  const defaultPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  try {
    // eslint-disable-next-line global-require
    const admin = require('firebase-admin');

    if (admin.apps.length === 0) {
      if (certPath) {
        const { resolve } = require('path');
        admin.initializeApp({
          credential: admin.credential.cert(resolve(certPath)),
        });
      } else if (defaultPath) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      }
    }

    if (admin.apps.length > 0) {
      messaging = admin.messaging();
      configured = true;
      console.log('[fcm] Firebase initialized, push messages enabled');
    }
  } catch (err) {
    console.warn(
      `[fcm] Firebase not configured (${err.message}). ` +
        'Push notifications will be logged only (mock mode).',
    );
  }

  if (!configured) {
    console.warn(
      '[fcm] FCM_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS not set. ' +
        'Running in mock push mode.',
    );
  }
}

/** @returns {boolean} true when a real Firebase Messaging client is available. */
function isFcmConfigured() {
  return configured;
}

/** @returns {import('firebase-admin').messaging.Messaging|null} */
function getMessaging() {
  return messaging;
}

module.exports = { initFirebase, isFcmConfigured, getMessaging };

const rateLimit = require('express-rate-limit');

const tooMany = { success: false, message: 'Too many requests, please try again later', code: 'RATE_LIMITED' };

/** Auth endpoints: 20 attempts / 15 min / IP. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
  keyGenerator: (req) => req.ip,
});

/**
 * Check-in endpoint: 1 request / second per device (ESP8266 retry
 * protocol handles transient failures, so the limit is deliberately
 * tight). Keyed by deviceId when available, else by IP.
 */
const checkinLimiter = rateLimit({
  windowMs: 1000,
  limit: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ...tooMany, code: 'CHECKIN_RATE_LIMITED' },
  keyGenerator: (req) => {
    const deviceId = req.body && req.body.deviceId ? req.body.deviceId : null;
    return deviceId ? `dev:${deviceId}` : req.ip;
  },
});

/** Device heartbeat: 1 request / 30s per device. */
const heartbeatLimiter = rateLimit({
  windowMs: 30 * 1000,
  limit: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ...tooMany, code: 'HEARTBEAT_RATE_LIMITED' },
  keyGenerator: (req) => {
    const deviceId = req.body && req.body.deviceId ? req.body.deviceId : null;
    return deviceId ? `hb:${deviceId}` : req.ip;
  },
});

/** General API limiter: 300 req / min / IP. */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
  keyGenerator: (req) => req.ip,
});

module.exports = { authLimiter, checkinLimiter, heartbeatLimiter, generalLimiter };

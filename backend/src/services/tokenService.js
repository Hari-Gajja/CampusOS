const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TTL = process.env.REFRESH_TOKEN_TTL || '7d';

/**
 * Sign a short-lived access token.
 * @param {{_id: import('mongoose').Types.ObjectId|string, role: string}} user
 * @returns {string}
 */
function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TTL },
  );
}

/**
 * Sign a long-lived refresh token. A SHA-256 digest is persisted in the
 * User document so a stolen database does not leak usable tokens.
 * @param {{_id: import('mongoose').Types.ObjectId|string, role: string}} user
 * @returns {string}
 */
function signRefreshToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TTL },
  );
}

/** @param {string} token @returns {string} SHA-256 hex digest. */
function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify an access token.
 * @param {string} token
 * @returns {{sub: string, role: string}} Verified payload.
 * @throws {ApiError} 401 on invalid/expired token.
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired access token', 'INVALID_TOKEN');
  }
}

/**
 * Verify a refresh token.
 * @param {string} token
 * @returns {{sub: string, role: string}} Verified payload.
 * @throws {ApiError} 401 on invalid/expired token.
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }
}

/**
 * Issue a fresh token pair for a user.
 * @param {{_id: string|import('mongoose').Types.ObjectId, role: string}} user
 * @returns {{accessToken: string, refreshToken: string, accessTokenExpiresIn: string}}
 */
function issueTokenPair(user) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    accessTokenExpiresIn: ACCESS_TTL,
  };
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  hashRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  issueTokenPair,
};

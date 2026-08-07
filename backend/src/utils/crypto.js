const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Pepper mixed into device API keys before hashing (defense in depth in
 * case the database is exfiltrated). Falls back to '' when unset.
 * @returns {string}
 */
function getPepper() {
  return process.env.DEVICE_API_KEY_HASH_SECRET || '';
}

/**
 * Generate a cryptographically random API key.
 * @param {number} [bytes=24] - Entropy in bytes.
 * @returns {string} Hex string.
 */
function generateApiKey(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash an API key (key + pepper) with bcrypt.
 * @param {string} apiKey - Plaintext key.
 * @returns {Promise<string>} bcrypt hash.
 */
async function hashApiKey(apiKey) {
  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  return bcrypt.hash(apiKey + getPepper(), rounds);
}

/**
 * Verify a plaintext API key against a stored bcrypt hash.
 * @param {string} apiKey - Plaintext key.
 * @param {string} hash - Stored hash.
 * @returns {Promise<boolean>}
 */
async function verifyApiKey(apiKey, hash) {
  if (!apiKey || !hash) return false;
  return bcrypt.compare(apiKey + getPepper(), hash);
}

/** Escape user input for safe use inside RegExp (NoSQL/search safety). */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { getPepper, generateApiKey, hashApiKey, verifyApiKey, escapeRegExp };

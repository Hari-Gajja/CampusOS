const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { getPepper } = require('../utils/crypto');

const deviceSchema = new mongoose.Schema(
  {
    // Public identifier, e.g. "dev-3f9c1a2b..." - stored in ESP8266 code
    deviceId: { type: String, required: true, unique: true, index: true },
    // bcrypt hash of (apiKey + pepper). Never returned after registration.
    apiKey: { type: String, required: true, select: false },
    location: { type: String, required: true, trim: true, maxlength: 60 },
    assignedClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    isActive: { type: Boolean, default: true },
    lastHeartbeat: { type: Date, default: null },
  },
  { timestamps: true },
);

/**
 * Verify a plaintext API key against the stored hash.
 * @param {string} plain - Plaintext API key sent by the device.
 * @returns {Promise<boolean>}
 */
deviceSchema.methods.compareApiKey = function compareApiKey(plain) {
  return bcrypt.compare(plain + getPepper(), this.apiKey);
};

module.exports = mongoose.model('Device', deviceSchema);

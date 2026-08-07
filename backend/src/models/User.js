const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false, minlength: 8 },
    role: {
      type: String,
      enum: ['hod', 'teacher', 'student', 'admin'],
      default: 'student',
      index: true,
    },
    nfcCardUid: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      index: true,
    },
    // SHA-256 hash of the current refresh token (never the raw token).
    refreshToken: { type: String, select: false },
  },
  { timestamps: true },
);

// Hash password before save
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  try {
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    this.password = await bcrypt.hash(this.password, rounds);
    return next();
  } catch (err) {
    return next(err);
  }
});

/**
 * Compare a plaintext password against the stored hash.
 * @param {string} plain - Plaintext password.
 * @returns {Promise<boolean>}
 */
userSchema.methods.matchPassword = function matchPassword(plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);

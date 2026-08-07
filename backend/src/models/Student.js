const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    btechYear: {
      type: String,
      enum: ['B.Tech 1st Year', 'B.Tech 2nd Year', 'B.Tech 3rd Year', 'B.Tech 4th Year'],
      default: 'B.Tech 1st Year',
    },
    // Hex UID emitted by the PN532 reader, e.g. "FA5F991A"
    nfcCardUid: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true,
      index: true,
    },
    enrolledClasses: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: [] },
    ],
    deviceToken: { type: String, trim: true, sparse: true },
    isBlocked: { type: Boolean, default: false },
    blockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Student', studentSchema);

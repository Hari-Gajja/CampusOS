const mongoose = require('mongoose');

const attendanceLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    timestamp: { type: Date, required: true, index: true },
    status: { type: String, enum: ['on-time', 'late'], required: true },
    nfcUid: { type: String, required: true, trim: true, uppercase: true },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Enforces "a student can't check in twice for the same session" at DB level.
attendanceLogSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceLog', attendanceLogSchema);

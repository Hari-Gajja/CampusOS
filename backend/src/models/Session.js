const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    checkInTime: { type: Date, required: true },
    status: { type: String, enum: ['on-time', 'late'], required: true },
  },
  { _id: true },
);

const sessionSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    // Date of the session as "YYYY-MM-DD" (UTC). One session per class per day.
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    isActive: { type: Boolean, default: true, index: true },
    attendees: { type: [attendeeSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

sessionSchema.index({ classId: 1, date: 1 }, { unique: true });
sessionSchema.index({ date: 1, isActive: 1 });

module.exports = mongoose.model('Session', sessionSchema);

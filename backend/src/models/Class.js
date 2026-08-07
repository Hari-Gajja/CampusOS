const mongoose = require('mongoose');

const scheduleSlotSchema = new mongoose.Schema(
  {
    // 0 = Sunday ... 6 = Saturday (UTC weekday of the class date)
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    // 24h "HH:mm" in UTC
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  },
  { _id: false },
);

const subjectSchema = new mongoose.Schema(
  {
    // Subject taught inside the class, e.g. { name: "Operating Systems", code: "CS-302", teacherId, schedule }
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, trim: true, default: '', maxlength: 40 },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
      index: true,
    },
    // Subject-wise weekly schedule slots
    schedule: { type: [scheduleSlotSchema], default: [] },
  },
  { _id: false },
);

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    subject: { type: String, trim: true, default: '', maxlength: 120 },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
      index: true,
    },
    // Class mentor/coordinator — the teacher who manages the class students.
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
      index: true,
    },
    // Subjects taught inside this class, each assigned to a teacher.
    subjects: { type: [subjectSchema], default: [] },
    room: { type: String, required: true, trim: true, maxlength: 60, index: true },
    btechYear: {
      type: String,
      enum: ['B.Tech 1st Year', 'B.Tech 2nd Year', 'B.Tech 3rd Year', 'B.Tech 4th Year'],
      default: 'B.Tech 1st Year',
    },
    schedule: { type: [scheduleSlotSchema], default: [] },
    lateThresholdMinutes: { type: Number, default: 5, min: 0, max: 120 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Class', classSchema);

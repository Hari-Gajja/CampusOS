const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    department: { type: String, trim: true, default: '' },
    nfcCardUid: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    assignedClasses: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: [] },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model('Teacher', teacherSchema);

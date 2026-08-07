const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const attendanceService = require('../services/attendanceService');
const { dateToKey } = require('../utils/time');

/** Teachers may only report on classes they are linked to (subject/mentor/primary). */
async function assertTeacherClassAccess(classId, user) {
  if (user.role !== 'teacher') return;
  const teacher = await Teacher.findOne({ userId: user.id });
  const schoolClass = await Class.findById(classId);
  if (!schoolClass) throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  if (!teacher) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  const id = String(teacher._id);
  const linked =
    String(schoolClass.teacherId || '') === id ||
    String(schoolClass.mentorId || '') === id ||
    (schoolClass.subjects || []).some((s) => String(s.teacherId) === id);
  if (!linked) throw new ApiError(403, 'You are not assigned to this class', 'FORBIDDEN');
}

/**
 * GET /api/v1/reports/attendance?classId=&from=&to=
 * Aggregate attendance percentage per student over a period.
 */
const attendanceReport = asyncHandler(async (req, res) => {
  const { classId } = req.query;
  if (!classId) throw new ApiError(400, 'classId is required', 'VALIDATION_ERROR');
  await assertTeacherClassAccess(classId, req.user);

  const from = req.query.from || null;
  const to = req.query.to || dateToKey(new Date());

  const range = { from, to };
  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    throw new ApiError(400, 'from must be YYYY-MM-DD', 'VALIDATION_ERROR');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw new ApiError(400, 'to must be YYYY-MM-DD', 'VALIDATION_ERROR');
  }

  const report = await attendanceService.attendanceReport({ classId, ...range });
  res.json({ success: true, ...report });
});

/**
 * GET /api/v1/reports/latecomers?classId=&date=
 */
const lateComers = asyncHandler(async (req, res) => {
  const { classId, date } = req.query;
  if (!classId || !date) {
    throw new ApiError(400, 'classId and date are required', 'VALIDATION_ERROR');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError(400, 'date must be YYYY-MM-DD', 'VALIDATION_ERROR');
  }
  await assertTeacherClassAccess(classId, req.user);

  const late = await attendanceService.lateComers({ classId, dateStr: date });
  res.json({ success: true, date, count: late.length, late });
});

module.exports = { attendanceReport, lateComers };

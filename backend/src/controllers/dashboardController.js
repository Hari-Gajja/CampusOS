const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Session = require('../models/Session');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const { dateToKey, combineWithDate, findSlotForDate } = require('../utils/time');

/**
 * GET /api/v1/dashboard/teacher
 * Upcoming classes (next 7 days) + today's live attendance summary for
 * the requesting teacher (admins see everything).
 */
const teacherDashboard = asyncHandler(async (req, res) => {
  const teacher =
    req.user.role === 'teacher' ? await Teacher.findOne({ userId: req.user.id }) : null;

  if (req.user.role === 'teacher' && !teacher) {
    throw new ApiError(404, 'Teacher profile not found', 'PROFILE_NOT_FOUND');
  }

  const classFilter =
    req.user.role === 'teacher'
      ? {
          $or: [
            { teacherId: teacher._id },
            { mentorId: teacher._id },
            { 'subjects.teacherId': teacher._id },
          ],
        }
      : {};

  const classes = await Class.find(classFilter).sort({ name: 1 });
  const classIds = classes.map((c) => c._id);
  const now = new Date();
  const today = dateToKey(now);

  // Today's sessions with live stats
  const todaySessions = classIds.length
    ? await Session.find({ classId: { $in: classIds }, date: today }).populate('classId', 'name subject room')
    : [];

  const summary = {
    totalClasses: classes.length,
    activeSessions: todaySessions.filter((s) => s.isActive).length,
    totalSessions: todaySessions.length,
    checkIns: todaySessions.reduce((sum, s) => sum + s.attendees.length, 0),
    onTime: todaySessions.reduce(
      (sum, s) => sum + s.attendees.filter((a) => a.status === 'on-time').length,
      0,
    ),
    late: todaySessions.reduce(
      (sum, s) => sum + s.attendees.filter((a) => a.status === 'late').length,
      0,
    ),
  };

  // Upcoming classes from recurring schedules (next 7 days)
  const upcoming = [];
  for (let day = 0; day < 7; day += 1) {
    const cursor = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
    const key = dateToKey(cursor);
    for (const schoolClass of classes) {
      const slot = findSlotForDate(schoolClass.schedule, key);
      if (!slot) continue;
      const start = combineWithDate(key, slot.startTime);
      const end = combineWithDate(key, slot.endTime);
      if (start.getTime() >= now.getTime()) {
        upcoming.push({
          classId: schoolClass._id,
          name: schoolClass.name,
          subject: schoolClass.subject,
          room: schoolClass.room,
          date: key,
          startTime: start,
          endTime: end,
        });
      }
    }
  }
  upcoming.sort((a, b) => a.startTime - b.startTime);

  res.json({
    success: true,
    date: today,
    summary,
    todaySessions: todaySessions.map((s) => ({
      id: s._id,
      className: s.classId ? s.classId.name : null,
      room: s.classId ? s.classId.room : null,
      startTime: s.startTime,
      endTime: s.endTime,
      isActive: s.isActive,
      attendance: {
        total: s.attendees.length,
        onTime: s.attendees.filter((a) => a.status === 'on-time').length,
        late: s.attendees.filter((a) => a.status === 'late').length,
      },
    })),
    upcoming,
  });
});

module.exports = { teacherDashboard };

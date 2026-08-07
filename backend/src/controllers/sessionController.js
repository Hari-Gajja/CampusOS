const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Session = require('../models/Session');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const sessionService = require('../services/sessionService');
const attendanceService = require('../services/attendanceService');
const blockingService = require('../services/blockingService');
const socketService = require('../services/socketService');
const { dateToKey } = require('../utils/time');

/** Class ids owned by the requesting teacher. */
async function teacherClassIds(user) {
  const teacher = await Teacher.findOne({ userId: user.id });
  if (!teacher) throw new ApiError(404, 'Teacher profile not found', 'PROFILE_NOT_FOUND');
  return teacher.assignedClasses || [];
}

/** True when the teacher is linked to the class (subject/mentor/primary). */
function isTeacherAssigned(schoolClass, teacherId) {
  if (!schoolClass || !teacherId) return false;
  const id = String(teacherId);
  return (
    String(schoolClass.teacherId || '') === id ||
    String(schoolClass.mentorId || '') === id ||
    (schoolClass.subjects || []).some((s) => String(s.teacherId) === id)
  );
}

/** Assert a teacher is linked to the class, otherwise forbid. */
async function assertTeacherAssigned(session, user) {
  if (user.role !== 'teacher') return;
  const teacher = await Teacher.findOne({ userId: user.id });
  let schoolClass = session.classId;
  if (!schoolClass || schoolClass.subjects === undefined || schoolClass.teacherId === undefined) {
    schoolClass = session.classId ? await Class.findById(session.classId) : null;
  }
  if (!teacher || !isTeacherAssigned(schoolClass || {}, teacher._id)) {
    throw new ApiError(403, 'You are not assigned to this class', 'FORBIDDEN');
  }
}

/**
 * GET /api/v1/sessions?date=YYYY-MM-DD
 * Sessions for a date with live attendance counts (teachers see their own).
 */
const listSessions = asyncHandler(async (req, res) => {
  const date = req.query.date || dateToKey(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError(400, 'date must be YYYY-MM-DD', 'VALIDATION_ERROR');
  }

  const classIds =
    req.user.role === 'teacher' ? await teacherClassIds(req.user) : undefined;

  const sessions = await sessionService.listSessionsForDate(date, classIds);
  res.json({ success: true, date, sessions });
});

/**
 * POST /api/v1/sessions/start
 * Manually start a session and push "block" to all enrolled students.
 * Body: { classId, date?, startTime?, endTime? }
 */
const startSession = asyncHandler(async (req, res) => {
  const { classId, date, startTime, endTime } = req.body;

  const schoolClass = await Class.findById(classId);
  if (!schoolClass) throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');

  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher || !isTeacherAssigned(schoolClass, teacher._id)) {
      throw new ApiError(403, 'You are not assigned to this class', 'FORBIDDEN');
    }
  }

  const session = await sessionService.startSessionManually({
    classId,
    dateKey: date || dateToKey(new Date()),
    startTime: startTime ? new Date(startTime) : undefined,
    endTime: endTime ? new Date(endTime) : undefined,
    createdBy: req.user.id,
  });

  // Side effects: push blocking + live event.
  await blockingService.blockSessionStudents(session);
  socketService.emitToClass(String(classId), 'session_started', {
    sessionId: String(session._id),
    classId: String(classId),
    startTime: session.startTime,
    endTime: session.endTime,
  });

  res.status(201).json({ success: true, session });
});

/**
 * POST /api/v1/sessions/end
 * End a session, push "unblock" and emit session_ended.
 * Body: { sessionId }
 */
const endSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const session = await Session.findById(sessionId).populate('classId');
  if (!session) throw new ApiError(404, 'Session not found', 'SESSION_NOT_FOUND');

  await assertTeacherAssigned(session, req.user);

  await sessionService.endSession({ sessionId, endedBy: req.user.id });
  await blockingService.unblockSessionStudents(session);
  socketService.emitToClass(String(session.classId._id), 'session_ended', {
    sessionId: String(session._id),
    classId: String(session.classId._id),
    endedAt: session.endedAt,
  });

  res.json({ success: true, session });
});

/**
 * GET /api/v1/sessions/:id/attendees
 * Detailed attendance list with statuses and check-in times.
 */
const getSessionAttendees = asyncHandler(async (req, res) => {
  const session = await attendanceService.getSessionAttendees(req.params.id);

  await assertTeacherAssigned(session, req.user);

  const attendees = session.attendees.map((a) => ({
    studentId: a.studentId ? a.studentId._id : a.studentId,
    name: a.studentId && a.studentId.userId ? a.studentId.userId.name : null,
    regNumber: a.studentId ? a.studentId.registrationNumber : null,
    status: a.status,
    checkInTime: a.checkInTime,
  }));

  res.json({
    success: true,
    session: {
      id: session._id,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      isActive: session.isActive,
      total: attendees.length,
      onTime: attendees.filter((a) => a.status === 'on-time').length,
      late: attendees.filter((a) => a.status === 'late').length,
    },
    attendees,
  });
});

/**
 * GET /api/v1/students/:studentId/attendance
 * Individual attendance history (student for self, teachers/admins for others).
 */
const getStudentAttendance = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  if (req.user.role === 'student') {
    const profile = await Student.findOne({ userId: req.user.id });
    if (!profile) throw new ApiError(404, 'Student profile not found', 'PROFILE_NOT_FOUND');
    // Allow self-service via either the user id or the student profile id.
    if (String(profile._id) !== String(studentId) && String(req.user.id) !== String(studentId)) {
      throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
    }
    const history = await attendanceService.getStudentHistory(profile._id);
    return res.json({ success: true, studentId: profile._id, history });
  }

  const history = await attendanceService.getStudentHistory(studentId);
  res.json({ success: true, studentId, history });
});

module.exports = {
  listSessions,
  startSession,
  endSession,
  getSessionAttendees,
  getStudentAttendance,
};

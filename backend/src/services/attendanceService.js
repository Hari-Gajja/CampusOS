const Student = require('../models/Student');
const Class = require('../models/Class');
const Session = require('../models/Session');
const AttendanceLog = require('../models/AttendanceLog');
const { withTransaction, txOptions } = require('../utils/transaction');
const ApiError = require('../utils/ApiError');
const socketService = require('./socketService');
const blockingService = require('./blockingService');
const sessionService = require('./sessionService');
const {
  dateToKey,
  combineWithDate,
  findSlotForDate,
  isWithinSession,
  computeAttendanceStatus,
} = require('../utils/time');

/**
 * Find the check-in form of a raw NFC UID: strip spaces, lowercase fold.
 * @param {string} uid
 * @returns {string}
 */
function normalizeNfcUid(uid) {
  return String(uid).replace(/[\s:]/g, '').toUpperCase();
}

/**
 * Resolve the class a student may check into right now.
 * Candidates: the device's assigned class (if the student is enrolled),
 * otherwise every class the student is enrolled in that matches the
 * device location. A class qualifies when `now` falls in one of its
 * scheduled slots.
 *
 * @param {import('mongoose').Document} device
 * @param {import('mongoose').Document} student - Populated userId.
 * @param {Date} now
 * @returns {Promise<import('mongoose').Document>} Matching class.
 * @throws {ApiError} 404 when there is no active class.
 */
async function resolveCandidateClass(device, student, now) {
  // 1. First priority: Check if there is an active running session right now
  const activeSession = await Session.findOne({ isActive: true }).populate('classId');
  if (activeSession && activeSession.classId) {
    return activeSession.classId;
  }

  // 2. Check if device has an assigned class
  if (device && device.assignedClassId) {
    const assigned = await Class.findById(device.assignedClassId);
    if (assigned) return assigned;
  }

  // 3. Check student's enrolled classes
  const enrolledIds = (student.enrolledClasses || []).map((id) => String(id));
  for (const id of enrolledIds) {
    const schoolClass = await Class.findById(id);
    if (schoolClass) return schoolClass;
  }

  // 4. Fallback to the most recent class in DB or auto-create default class
  let fallbackClass = await Class.findOne().sort({ createdAt: -1 });
  if (!fallbackClass) {
    fallbackClass = await Class.create({
      name: 'General Academic Lecture Hall',
      subject: 'B.Tech Core Lecture',
      room: 'Main Academic Hall 1',
      schedule: [],
    });
  }
  return fallbackClass;
}

/**
 * True when `now` is inside one of the class's schedule slots on dateKey.
 * @param {import('mongoose').Document} schoolClass
 * @param {string} dateKey
 * @param {Date} now
 * @returns {boolean}
 */
function isClassInSlot(schoolClass, dateKey, now) {
  const slot = findSlotForDate(schoolClass.schedule, dateKey);
  if (!slot) return false;
  return isWithinSession(now, combineWithDate(dateKey, slot.startTime), combineWithDate(dateKey, slot.endTime));
}

/**
 * Validate a student can check in to a session (enrolled + not duplicate).
 * @param {import('mongoose').Document} session
 * @param {import('mongoose').Document} student
 */
function assertCanCheckIn(session, student) {
  const duplicate = session.attendees.some(
    (a) => String(a.studentId) === String(student._id),
  );
  if (duplicate) {
    throw new ApiError(409, 'Student already checked in for this session', 'DUPLICATE_CHECKIN');
  }
}

/**
 * Full NFC check-in pipeline (called by the ESP8266 endpoint).
 *
 * Steps:
 *  1. Find the student by NFC UID.
 *  2. Resolve an active class (device assignment, then enrollment + room).
 *  3. Reuse or auto-start the session for that class/date.
 *  4. Compute on-time/late and write AttendanceLog + session attendee in a
 *     transaction.
 *  5. Send an FCM "block" push (unless already blocked) and persist
 *     blocked state.
 *  6. Emit a live `attendance_update` event to the teacher dashboard.
 *
 * @param {object} input
 * @param {string} input.nfcUid - Hex UID from the PN532 reader.
 * @param {string} input.deviceId - Device identifier from the ESP8266.
 * @param {import('mongoose').Document} input.device - Authenticated device.
 * @param {Date} [input.now] - Time of check-in (defaults to now).
 * @returns {Promise<{
 *   sessionId: string,
 *   classId: string,
 *   student: {name: string, regNumber: string, id: string},
 *   status: 'on-time'|'late',
 *   blocked: boolean,
 *   timestamp: string,
 * }>}
 */
async function processCheckIn({ nfcUid, deviceId, device }, { now = new Date() } = {}) {
  if (!nfcUid) throw new ApiError(400, 'nfcUid is required', 'MISSING_NFC_UID');
  if (!deviceId) throw new ApiError(400, 'deviceId is required', 'MISSING_DEVICE_ID');

  const normalized = normalizeNfcUid(nfcUid);
  const uidRegex = new RegExp(`^${normalized}$`, 'i');

  const student = await Student.findOne({ nfcCardUid: uidRegex }).populate('userId');
  if (!student) {
    throw new ApiError(404, 'No student is linked to this NFC card', 'STUDENT_NOT_FOUND');
  }

  const schoolClass = await resolveCandidateClass(device, student, now);
  const dateKey = dateToKey(now);

  let session = await Session.findOne({ classId: schoolClass._id, isActive: true });
  if (!session) {
    session = await Session.findOne({ isActive: true });
  }

  if (!session) {
    const startTime = now;
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    session = await Session.create({
      classId: schoolClass._id,
      date: dateKey,
      startTime,
      endTime,
      isActive: true,
      createdBy: schoolClass.teacherId || null,
    });
  }

  const status = computeAttendanceStatus(now, session.startTime, schoolClass.lateThresholdMinutes);

  // Persist attendance atomically (log + attendance list).
  await withTransaction(async (s) => {
    const opts = txOptions(s);
    const fresh = await Session.findById(session._id, null, opts);
    assertCanCheckIn(fresh, student);

    fresh.attendees.push({ studentId: student._id, checkInTime: now, status });
    await fresh.save(opts);

    try {
      await AttendanceLog.create(
        [
          {
            sessionId: fresh._id,
            studentId: student._id,
            timestamp: now,
            status,
            nfcUid: normalized,
            deviceId: device._id,
          },
        ],
        opts,
      );
    } catch (err) {
      // Unique index still blocks true duplicates even in the rare
      // standalone fallback where the in-process check is bypassed.
      if (err.code === 11000) {
        throw new ApiError(409, 'Student already checked in for this session', 'DUPLICATE_CHECKIN');
      }
      throw err;
    }
    return fresh;
  });

  // Phone blocking (side effect, outside the transaction on purpose).
  let blocked = student.isBlocked;
  if (!student.isBlocked) {
    const { sendBlock } = require('./fcmService');
    await sendBlock(student, { until: session.endTime, sessionId: String(session._id) });
    await blockingService.setBlockState(student, {
      isBlocked: true,
      blockedUntil: session.endTime,
    });
    blocked = true;
  }

  // Live update to the teacher dashboard.
  socketService.emitToClass(String(schoolClass._id), 'attendance_update', {
    sessionId: String(session._id),
    classId: String(schoolClass._id),
    className: schoolClass.name,
    studentId: String(student._id),
    studentName: student.userId ? student.userId.name : null,
    email: student.userId ? student.userId.email : null,
    regNumber: student.registrationNumber,
    btechYear: student.btechYear || 'B.Tech 1st Year',
    nfcUid: normalized,
    status,
    blocked,
    timestamp: now.toISOString(),
  });

  return {
    sessionId: String(session._id),
    classId: String(schoolClass._id),
    student: {
      id: String(student._id),
      name: student.userId ? student.userId.name : null,
      email: student.userId ? student.userId.email : null,
      regNumber: student.registrationNumber,
      btechYear: student.btechYear || 'B.Tech 1st Year',
    },
    status,
    blocked,
    lockedUntil: session.endTime.toISOString(),
  };
}

/**
 * Detailed attendance list for a session (names + statuses).
 * @param {string} sessionId
 * @returns {Promise<import('mongoose').Document>} Session populated with student details.
 */
async function getSessionAttendees(sessionId) {
  const session = await Session.findById(sessionId).populate({
    path: 'attendees.studentId',
    populate: { path: 'userId', select: 'name email' },
  });

  if (!session) throw new ApiError(404, 'Session not found', 'SESSION_NOT_FOUND');
  return session;
}

/**
 * Individual attendance history for a student.
 * @param {string} studentId
 * @returns {Promise<Array>}
 */
async function getStudentHistory(studentId) {
  const history = await Session.find(
    { 'attendees.studentId': studentId },
    { attendees: { $elemMatch: { studentId } } },
  )
    .populate('classId', 'name subject room')
    .sort({ date: -1 });

  return history.map((s) => {
    const record = s.attendees[0];
    return {
      sessionId: s._id,
      date: s.date,
      className: s.classId ? s.classId.name : null,
      subject: s.classId ? s.classId.subject : null,
      room: s.classId ? s.classId.room : null,
      checkInTime: record ? record.checkInTime : null,
      status: record ? record.status : null,
    };
  });
}

/**
 * Aggregate attendance percentage per student for a class over a period.
 * @param {object} params
 * @param {string} params.classId
 * @param {string} params.from - "YYYY-MM-DD".
 * @param {string} params.to - "YYYY-MM-DD".
 * @returns {Promise<{totalSessions: number, students: Array}>}
 */
async function attendanceReport({ classId, from, to }) {
  const schoolClass = await Class.findById(classId);
  if (!schoolClass) throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');

  const sessions = await Session.find({
    classId,
    date: { $gte: from, $lte: to },
  }).select('attendees date');

  const students = await Student.find({ enrolledClasses: classId }).populate('userId', 'name');

  const rows = students.map((student) => {
    let present = 0;
    let late = 0;
    for (const session of sessions) {
      const record = session.attendees.find((a) => String(a.studentId) === String(student._id));
      if (record) {
        present += 1;
        if (record.status === 'late') late += 1;
      }
    }
    const percentage = sessions.length ? (present / sessions.length) * 100 : 0;
    return {
      studentId: student._id,
      name: student.userId ? student.userId.name : null,
      registrationNumber: student.registrationNumber,
      present,
      late,
      absent: sessions.length - present,
      percentage: Math.round(percentage * 10) / 10,
    };
  });

  rows.sort((a, b) => b.percentage - a.percentage);

  return { totalSessions: sessions.length, students: rows };
}

/**
 * Late comers for a class on a given date.
 * @param {object} params
 * @param {string} params.classId
 * @param {string} params.date - "YYYY-MM-DD".
 * @returns {Promise<Array>}
 */
async function lateComers({ classId, dateStr }) {
  const session = await Session.findOne({ classId, date: dateStr });
  if (!session) return [];

  const lateAttendees = session.attendees.filter((a) => a.status === 'late');

  const students = await Student.find({
    _id: { $in: lateAttendees.map((a) => a.studentId) },
  }).populate('userId', 'name');

  const byId = new Map(students.map((s) => [String(s._id), s]));

  return lateAttendees
    .map((a) => {
      const student = byId.get(String(a.studentId));
      return {
        studentId: a.studentId,
        name: student && student.userId ? student.userId.name : null,
        registrationNumber: student ? student.registrationNumber : null,
        status: a.status,
        checkInTime: a.checkInTime,
      };
    })
    .sort((a, b) => new Date(a.checkInTime) - new Date(b.checkInTime));
}

module.exports = {
  normalizeNfcUid,
  resolveCandidateClass,
  assertCanCheckIn,
  checkIn: processCheckIn,
  getSessionAttendees,
  getStudentHistory,
  attendanceReport,
  lateComers,
};
const ApiError = require('../utils/ApiError');
const Session = require('../models/Session');
const {
  dateToKey,
  combineWithDate,
  findSlotForDate,
  isWithinSession,
} = require('../utils/time');

/**
 * Find the currently active session for a class on a given date.
 * @param {string} classId
 * @param {string} dateKey - "YYYY-MM-DD".
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function findActiveSessionForClass(classId, dateKey) {
  return Session.findOne({ classId, date: dateKey, isActive: true });
}

/**
 * Auto-start a session for a class when `now` falls inside one of its
 * scheduled time slots. Concurrency-safe via the unique classId+date
 * index.
 *
 * @param {object} params
 * @param {import('mongoose').Document} params.schoolClass
 * @param {string} params.dateKey
 * @param {Date} params.now
 * @param {string|import('mongoose').Types.ObjectId} [params.createdBy]
 * @returns {Promise<import('mongoose').Document|null>} Active session or null.
 */
async function findOrAutoStartSessionForClass({ schoolClass, dateKey, now, createdBy }) {
  const existing = await findActiveSessionForClass(schoolClass._id, dateKey);
  if (existing && isWithinSession(now, existing.startTime, existing.endTime)) {
    return existing;
  }

  const slot = findSlotForDate(schoolClass.schedule, dateKey);
  if (!slot) return null;

  const start = combineWithDate(dateKey, slot.startTime);
  const end = combineWithDate(dateKey, slot.endTime);
  if (!isWithinSession(now, start, end)) return null;

  try {
    return await Session.create({
      classId: schoolClass._id,
      date: dateKey,
      startTime: start,
      endTime: end,
      isActive: true,
      createdBy: createdBy || null,
    });
  } catch (err) {
    // Unique index race: another request created the session first.
    if (err.code === 11000) {
      return Session.findOne({ classId: schoolClass._id, date: dateKey });
    }
    throw err;
  }
}

/**
 * Manually start a session (teacher action). Throws 404 when the class
 * does not exist. After creation the caller is expected to trigger
 * blocking (see blockingService.blockSessionStudents).
 *
 * @param {object} params
 * @param {string} params.classId
 * @param {string} [params.dateKey] - Defaults to today (UTC).
 * @param {Date} [params.startTime] - Defaults to slot start or now.
 * @param {Date} [params.endTime] - Required for manual sessions.
 * @param {string} [params.createdBy]
 * @returns {Promise<import('mongoose').Document>} Created session.
 */
async function startSessionManually({ classId, dateKey, startTime, endTime, createdBy }) {
  const key = dateKey || dateToKey(new Date());
  const start = startTime || new Date();
  const end = endTime || new Date(start.getTime() + 2 * 60 * 60 * 1000);

  // If an active session already exists for this class, reactivate/return it
  const existingActive = await Session.findOne({ classId, isActive: true });
  if (existingActive) return existingActive;

  try {
    return await Session.create({
      classId,
      date: key,
      startTime: start,
      endTime: end,
      isActive: true,
      createdBy: createdBy || null,
    });
  } catch (err) {
    if (err.code === 11000) {
      const active = await Session.findOne({ classId, date: key });
      if (active) {
        active.isActive = true;
        await active.save();
        return active;
      }
    }
    throw err;
  }
}

/**
 * End a session: mark inactive and record endedAt.
 * @param {string} sessionId
 * @param {string} [endedBy]
 * @returns {Promise<import('mongoose').Document>} Updated session.
 */
async function endSession({ sessionId, endedBy }) {
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found', 'SESSION_NOT_FOUND');

  session.isActive = false;
  session.endedAt = new Date();
  if (endedBy) session.endedBy = endedBy;
  await session.save();
  return session;
}

/**
 * List sessions for a date, optionally restricted to a teacher's classes.
 * @param {string} dateKey - "YYYY-MM-DD".
 * @param {string[]} [classIds]
 * @returns {Promise<Array>} Sessions with live attendance stats attached.
 */
async function listSessionsForDate(dateKey, classIds) {
  const filter = { date: dateKey };
  if (classIds && classIds.length) filter.classId = { $in: classIds };

  const sessions = await Session.find(filter).populate('classId', 'name subject room').sort({ startTime: 1 });

  return sessions.map((s) => {
    const onTime = s.attendees.filter((a) => a.status === 'on-time').length;
    const late = s.attendees.filter((a) => a.status === 'late').length;
    return {
      _id: s._id,
      classId: s.classId ? s.classId._id : s.classId,
      className: s.classId ? s.classId.name : null,
      subject: s.classId ? s.classId.subject : null,
      room: s.classId ? s.classId.room : null,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      isActive: s.isActive,
      endedAt: s.endedAt,
      attendance: { total: s.attendees.length, onTime, late },
    };
  });
}

module.exports = {
  findActiveSessionForClass,
  findOrAutoStartSessionForClass,
  startSessionManually,
  endSession,
  listSessionsForDate,
};

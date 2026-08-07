const Student = require('../models/Student');

/**
 * Persist the blocked state of a student.
 * @param {import('mongoose').Document} student
 * @param {{isBlocked: boolean, blockedUntil?: Date|null}} state
 */
async function setBlockState(student, { isBlocked, blockedUntil = null }) {
  if (student.isBlocked === isBlocked && String(student.blockedUntil) === String(blockedUntil)) {
    return student;
  }
  student.isBlocked = isBlocked;
  student.blockedUntil = blockedUntil;
  return student.save();
}

/**
 * Send FCM "block" to every enrolled student of a session's class and
 * persist isBlocked=true / blockedUntil=session.endTime.
 * @param {import('mongoose').Document} session - Populated with classId.
 * @returns {Promise<{sent: number, failed: number}>}
 */
async function blockSessionStudents(session) {
  const students = await Student.find({ enrolledClasses: session.classId });

  let sent = 0;
  let failed = 0;
  const results = await Promise.allSettled(
    students.map(async (student) => {
      const { sendBlock } = require('./fcmService');
      const res = await sendBlock(student, {
        until: session.endTime,
        sessionId: String(session._id),
      });
      if (res.sent) sent += 1;
      else failed += 1;
      if (res.sent || res.reason !== 'NO_DEVICE_TOKEN') {
        await setBlockState(student, { isBlocked: true, blockedUntil: session.endTime });
      }
      return res;
    }),
  );

  return { sent, failed, total: students.length };
}

/**
 * Send FCM "unblock" to every enrolled student of a session's class and
 * clear the persisted blocked state.
 * @param {import('mongoose').Document} session
 * @returns {Promise<{sent: number, failed: number}>}
 */
async function unblockSessionStudents(session) {
  const students = await Student.find({ enrolledClasses: session.classId });

  let sent = 0;
  let failed = 0;
  const results = await Promise.allSettled(
    students.map(async (student) => {
      const { sendUnblock } = require('./fcmService');
      const res = await sendUnblock(student, { sessionId: String(session._id) });
      if (res.sent) sent += 1;
      else failed += 1;
      if (res.sent || res.reason !== 'NO_DEVICE_TOKEN') {
        await setBlockState(student, { isBlocked: false, blockedUntil: null });
      }
      return res;
    }),
  );

  return { sent, failed, total: students.length };
}

module.exports = {
  setBlockState,
  blockSessionStudents,
  unblockSessionStudents,
};

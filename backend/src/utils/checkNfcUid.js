const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');

/**
 * Find if an NFC Card UID is already assigned to any user across Student and Teacher collections.
 * @param {string} rawUid - Hex string UID
 * @param {string} [excludeUserId] - Optional user ID to exclude (for editing current user)
 * @returns {Promise<{ isAssigned: boolean, owner?: { id: string, name: string, email: string, role: string, department?: string, registrationNumber?: string } }>}
 */
async function checkNfcUidOwner(rawUid, excludeUserId = null) {
  if (!rawUid) return { isAssigned: false };
  const cleanUid = String(rawUid).replace(/[\s:]/g, '').toUpperCase();
  const uidRegex = new RegExp(`^${cleanUid}$`, 'i');

  // 1. Search in Student profile
  const student = await Student.findOne({ nfcCardUid: uidRegex });
  if (student && (!excludeUserId || String(student.userId) !== String(excludeUserId))) {
    const user = await User.findById(student.userId);
    return {
      isAssigned: true,
      owner: {
        id: student.userId,
        name: user ? user.name : 'Student',
        email: user ? user.email : '',
        role: user ? user.role : 'student',
        registrationNumber: student.registrationNumber,
        btechYear: student.btechYear,
      },
    };
  }

  // 2. Search in Teacher/HOD profile
  const teacher = await Teacher.findOne({ nfcCardUid: uidRegex });
  if (teacher && (!excludeUserId || String(teacher.userId) !== String(excludeUserId))) {
    const user = await User.findById(teacher.userId);
    return {
      isAssigned: true,
      owner: {
        id: teacher.userId,
        name: user ? user.name : 'Faculty Member',
        email: user ? user.email : '',
        role: user ? user.role : 'teacher',
        department: teacher.department,
      },
    };
  }

  return { isAssigned: false };
}

module.exports = { checkNfcUidOwner };

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Session = require('../models/Session');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const blockingService = require('../services/blockingService');
const fcmService = require('../services/fcmService');

/** Assert the user owns the class of a session (subject/mentor/primary teacher). */
async function assertSessionOwnership(session, user) {
  if (user.role === 'admin' || user.role === 'hod') return;
  const teacher = await Teacher.findOne({ userId: user.id });
  const schoolClass = session.classId;
  if (!teacher || !schoolClass) throw new ApiError(403, 'You do not own this class', 'FORBIDDEN');
  const id = String(teacher._id);
  const linked =
    String(schoolClass.teacherId || '') === id ||
    String(schoolClass.mentorId || '') === id ||
    (schoolClass.subjects || []).some((s) => String(s.teacherId) === id);
  if (!linked) throw new ApiError(403, 'You are not assigned to this class', 'FORBIDDEN');
}

/**
 * POST /api/v1/blocking/start  { sessionId }
 * Push { type: "block", until } to every enrolled student of the session.
 */
const startBlocking = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const session = await Session.findById(sessionId).populate('classId');
  if (!session) throw new ApiError(404, 'Session not found', 'SESSION_NOT_FOUND');
  await assertSessionOwnership(session, req.user);

  const result = await blockingService.blockSessionStudents(session);
  res.json({ success: true, ...result });
});

/**
 * POST /api/v1/blocking/end  { sessionId }
 * Push { type: "unblock" } and clear blocked state.
 */
const endBlocking = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const session = await Session.findById(sessionId).populate('classId');
  if (!session) throw new ApiError(404, 'Session not found', 'SESSION_NOT_FOUND');
  await assertSessionOwnership(session, req.user);

  const result = await blockingService.unblockSessionStudents(session);
  res.json({ success: true, ...result });
});

/**
 * GET & POST /api/v1/blocking/status  (student app sync)
 * Query active sessions and enforce app blocking state until teacher stops the class.
 */
const reportStatus = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user.id });
  if (!student) throw new ApiError(404, 'Student profile not found', 'PROFILE_NOT_FOUND');

  // Check if any active class session is currently running
  const activeSession = await Session.findOne({
    isActive: true,
    $or: [
      { classId: { $in: student.enrolledClasses || [] } },
      { _id: { $exists: true } },
    ],
  }).sort({ createdAt: -1 }).populate('classId', 'name room');

  const isClassInProgress = Boolean(activeSession && activeSession.isActive);
  const activeEndTime = isClassInProgress ? activeSession.endTime : null;

  if (isClassInProgress) {
    await blockingService.setBlockState(student, { isBlocked: true, blockedUntil: activeEndTime });
  } else if (student.blockedUntil && new Date(student.blockedUntil).getTime() <= Date.now()) {
    await blockingService.setBlockState(student, { isBlocked: false, blockedUntil: null });
  }

  const currentlyBlocked = student.isBlocked || isClassInProgress;

  res.json({
    success: true,
    state: currentlyBlocked ? 'block' : 'unblock',
    isBlocked: currentlyBlocked,
    blockedUntil: currentlyBlocked ? (activeSession ? activeSession.endTime : student.blockedUntil) : null,
    className: activeSession && activeSession.classId ? activeSession.classId.name : null,
    room: activeSession && activeSession.classId ? activeSession.classId.room : null,
    policy: 'CROSS_PLATFORM_STRICT_LOCK',
    supportedOs: ['Windows OS', 'Android OS', 'iOS / iPadOS', 'macOS', 'Linux'],
    androidPolicy: {
      mode: 'STRICT_MOBILE_LOCK',
      allowedPackages: [
        'com.google.android.dialer',
        'com.android.phone',
        'com.samsung.android.dialer',
        'com.apple.mobilephone',
        'com.android.incallui',
      ],
      blockedPackages: '*',
    },
    windowsPolicy: {
      mode: 'STRICT_DESKTOP_LOCK',
      blockedExecutables: [
        'chrome.exe',
        'msedge.exe',
        'firefox.exe',
        'discord.exe',
        'steam.exe',
        'spotify.exe',
        'telegram.exe',
        'whatsapp.exe',
        '*',
      ],
      whitelistedExecutables: ['dialer.exe', 'phone.exe', 'CampusOSClient.exe'],
    },
    allowedApps: [
      'com.google.android.dialer',
      'com.android.phone',
      'com.samsung.android.dialer',
      'com.apple.mobilephone',
      'com.android.incallui',
      'phone.exe',
      'dialer.exe',
    ],
    blockedApps: '*',
    message: 'All Windows desktop & Android mobile applications are strictly locked. Only Phone Calls are allowed.',
  });
});

module.exports = { startBlocking, endBlocking, reportStatus };

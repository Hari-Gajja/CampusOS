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
 * POST /api/v1/blocking/status  (student app)
 * Body: { isBlocked: boolean, sessionId?: string }
 * The app reports its local blocking state; the server reconciles its
 * persisted flag and responds with the expected state.
 */
const reportStatus = asyncHandler(async (req, res) => {
  const { isBlocked, sessionId } = req.body;

  const student = await Student.findOne({ userId: req.user.id });
  if (!student) throw new ApiError(404, 'Student profile not found', 'PROFILE_NOT_FOUND');

  let activeSessionInfo = null;
  if (student.blockedUntil || student.isBlocked) {
    const activeSession = await Session.findOne({
      isActive: true,
      endTime: { $gt: new Date() },
    }).populate('classId', 'name room');
    if (activeSession && activeSession.classId) {
      activeSessionInfo = {
        className: activeSession.classId.name,
        room: activeSession.classId.room,
      };
    }
  }

  if (typeof isBlocked === 'boolean') {
    if (!isBlocked && student.isBlocked && sessionId) {
      // App claims it is unlocked; verify the session is actually over
      // before trusting it, otherwise re-send the block command.
      const session = await Session.findById(sessionId);
      const sessionOver = session && (!session.isActive || new Date(session.endTime).getTime() <= Date.now());
      if (!sessionOver) {
        const { sendBlock } = fcmService;
        await sendBlock(student, { until: student.blockedUntil || new Date(), sessionId });
        return res.json({ success: true, state: 'block', reblocked: true, ...activeSessionInfo });
      }
    }
    await blockingService.setBlockState(student, { isBlocked: Boolean(isBlocked) });
  }

  res.json({
    success: true,
    state: student.isBlocked ? 'block' : 'unblock',
    blockedUntil: student.blockedUntil,
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
    ...activeSessionInfo,
  });
});

module.exports = { startBlocking, endBlocking, reportStatus };

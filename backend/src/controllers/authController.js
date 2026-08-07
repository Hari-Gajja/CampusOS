const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { withTransaction, txOptions } = require('../utils/transaction');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const tokenService = require('../services/tokenService');

const publicUser = (user, role) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role,
});

/**
 * POST /api/v1/auth/register
 * Create a teacher/student account (admin only). Wraps User + profile
 * creation in a transaction.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, department, registrationNumber, btechYear, nfcCardUid } = req.body;

  // Strict RBAC Hierarchy Enforcement
  if (req.user.role === 'admin' && role !== 'hod') {
    throw new ApiError(403, 'Administrators can only add HOD accounts', 'FORBIDDEN_ROLE');
  }
  if (req.user.role === 'hod' && role !== 'teacher') {
    throw new ApiError(403, 'HODs can only add Teacher accounts', 'FORBIDDEN_ROLE');
  }
  if (req.user.role === 'teacher' && role !== 'student') {
    throw new ApiError(403, 'Teachers can only add Student accounts', 'FORBIDDEN_ROLE');
  }

  // Systematic workflow: only teachers acting as a class mentor may add
  // students (and only into their own mentor classes).
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ userId: req.user.id });
    const mentorCount = teacher ? await Class.countDocuments({ mentorId: teacher._id }) : 0;
    if (!mentorCount) {
      throw new ApiError(
        403,
        'Only teachers assigned as a class mentor can register student accounts',
        'MENTOR_REQUIRED',
      );
    }
  }

  const formattedUid = nfcCardUid ? String(nfcCardUid).replace(/[\s:]/g, '').toUpperCase() : undefined;

  if (formattedUid) {
    const { checkNfcUidOwner } = require('../utils/checkNfcUid');
    const ownerCheck = await checkNfcUidOwner(formattedUid);
    if (ownerCheck.isAssigned) {
      const owner = ownerCheck.owner;
      throw new ApiError(
        400,
        `NFC Card UID '${formattedUid}' is already assigned to ${owner.name} (${owner.role.toUpperCase()}${owner.department ? ' - ' + owner.department : ''}). Please use a unique card.`,
        'DUPLICATE_NFC_CARD'
      );
    }
  }

  const result = await withTransaction(async (session) => {
    const opts = txOptions(session);
    const [user] = await User.create([{ name, email, password, role, nfcCardUid: formattedUid }], opts);

    if (role === 'student') {
      if (!registrationNumber) {
        throw new ApiError(400, 'registrationNumber is required for students', 'VALIDATION_ERROR');
      }
      await Student.create([{ userId: user._id, registrationNumber, btechYear: btechYear || 'B.Tech 1st Year', nfcCardUid: formattedUid }], opts);
    } else if (role === 'teacher' || role === 'hod') {
      await Teacher.create([{ userId: user._id, department: department || '', nfcCardUid: formattedUid }], opts);
    }
    return user;
  });

  res.status(201).json({ success: true, user: publicUser(result, role) });
});

/**
 * POST /api/v1/auth/login
 * Verify credentials and issue an access + refresh token pair.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = String(email || '').toLowerCase().trim();

  const user = await User.findOne({ email: cleanEmail }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const pair = tokenService.issueTokenPair(user);
  user.refreshToken = tokenService.hashRefreshToken(pair.refreshToken);
  await user.save();

  res.json({
    success: true,
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
    user: publicUser(user, user.role),
  });
});

/**
 * POST /api/v1/auth/refresh-token
 * Rotates the refresh token (old token is invalidated).
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) throw new ApiError(400, 'refreshToken is required', 'REFRESH_TOKEN_REQUIRED');

  const payload = tokenService.verifyRefreshToken(token);

  const user = await User.findById(payload.sub).select('+refreshToken');
  if (!user) throw new ApiError(401, 'User no longer exists', 'INVALID_REFRESH_TOKEN');

  const storedHash = user.refreshToken;
  const presentedHash = tokenService.hashRefreshToken(token);
  if (!storedHash || storedHash !== presentedHash) {
    throw new ApiError(401, 'Refresh token was revoked', 'REFRESH_TOKEN_REVOKED');
  }

  const storedExp = new Date(payload.exp * 1000);
  if (storedExp.getTime() < Date.now()) {
    throw new ApiError(401, 'Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
  }

  const pair = tokenService.issueTokenPair(user);
  user.refreshToken = tokenService.hashRefreshToken(pair.refreshToken);
  await user.save();

  res.json({ success: true, ...pair, user: publicUser(user, user.role) });
});

/**
 * POST /api/v1/auth/logout
 * Invalidates the stored refresh token.
 */
const logout = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $unset: { refreshToken: 1 } });
  res.json({ success: true });
});

/**
 * POST /api/v1/auth/change-password
 * Verifies the current password, sets a new one and revokes all sessions.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');
  if (!user || !(await user.matchPassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect', 'INVALID_CREDENTIALS');
  }

  user.password = newPassword;
  user.refreshToken = undefined;
  await user.save();

  res.json({ success: true });
});

module.exports = { register, login, refreshToken, logout, changePassword };

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { withTransaction, txOptions } = require('../utils/transaction');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const { escapeRegExp } = require('../utils/crypto');

/** Teachers may only manage students if they are assigned as a class mentor. */
async function assertTeacherIsMentor(user) {
  if (user.role !== 'teacher') return;
  const teacher = await Teacher.findOne({ userId: user.id });
  const mentorCount = teacher ? await Class.countDocuments({ mentorId: teacher._id }) : 0;
  if (!mentorCount) {
    throw new ApiError(
      403,
      'Only teachers assigned as a class mentor can manage student accounts',
      'MENTOR_REQUIRED',
    );
  }
}

const PROFILE_MODEL = {
  student: Student,
  teacher: Teacher,
  hod: Teacher,
};

/**
 * Attach the role-specific profile (Student/Teacher) to the user.
 * @param {import('mongoose').Document} user
 * @returns {Promise<object>}
 */
async function attachProfile(user) {
  const Model = PROFILE_MODEL[user.role];
  const profile = Model ? await Model.findOne({ userId: user._id }) : null;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    ...(profile ? (profile.toObject ? profile.toObject() : profile) : {}),
  };
}

const buildUserQuery = ({ role, search }) => {
  const filter = {};
  if (role) filter.role = role;
  if (search) {
    const re = new RegExp(escapeRegExp(search), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }
  return filter;
};

/**
 * GET /api/v1/users?role=&search=&page=&limit=
 * List users (admin all; teachers may list students only).
 */
const listUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  let filter = buildUserQuery({ role, search });
  if (req.user.role === 'teacher' && filter.role !== 'student') {
    throw new ApiError(403, 'Teachers may only list students', 'FORBIDDEN');
  }
  if (req.user.role === 'hod' && filter.role === 'admin') {
    throw new ApiError(403, 'HODs cannot list admin accounts', 'FORBIDDEN');
  }

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
  ]);

  const enriched = await Promise.all(users.map(attachProfile));

  res.json({
    success: true,
    data: enriched,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/v1/users/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  res.json({ success: true, user: await attachProfile(user) });
});

/**
 * GET /api/v1/users/:id
 */
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  res.json({ success: true, user: await attachProfile(user) });
});

/**
 * PUT /api/v1/users/:id
 * Update profile. Admins can update anyone; teachers can only update a
 * student's profile data (registration, NFC UID, device token, name…).
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  const user = await User.findById(id).select('+password');
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  if (req.user.role !== 'admin') {
    if (req.user.role === 'hod') {
      // HODs may edit teacher accounts in their department, not students,
      // other HODs, or admins.
      if (user.role !== 'teacher') {
        throw new ApiError(403, 'HODs may only edit teacher accounts', 'FORBIDDEN');
      }
      const blocked = ['role'];
      for (const k of blocked) delete body[k];
    } else {
      // Teachers may only edit student accounts.
      if (user.role !== 'student') throw new ApiError(403, 'Teachers may only edit student accounts', 'FORBIDDEN');
      const blocked = ['role'];
      for (const k of blocked) delete body[k];
    }
  }

  // Whitelisted fields
  if (typeof body.name === 'string' && body.name) user.name = body.name;
  if (typeof body.email === 'string' && body.email) user.email = body.email;
  if (typeof body.password === 'string' && body.password.length >= 8) {
    user.password = body.password;
  }

  if (typeof body.nfcCardUid === 'string' && body.nfcCardUid) {
    const formatted = body.nfcCardUid.replace(/[\s:]/g, '').toUpperCase();
    const { checkNfcUidOwner } = require('../utils/checkNfcUid');
    const ownerCheck = await checkNfcUidOwner(formatted, id);
    if (ownerCheck.isAssigned) {
      const owner = ownerCheck.owner;
      throw new ApiError(
        400,
        `NFC Card UID '${formatted}' is already assigned to ${owner.name} (${owner.role.toUpperCase()}${owner.department ? ' - ' + owner.department : ''}). Please use a unique card.`,
        'DUPLICATE_NFC_CARD'
      );
    }
  }

  if (typeof body.nfcCardUid === 'string') {
    user.nfcCardUid = body.nfcCardUid ? body.nfcCardUid.replace(/[\s:]/g, '').toUpperCase() : undefined;
  }

  const result = await withTransaction(async (session) => {
    const opts = txOptions(session);
    await user.save(opts);

    if (user.role === 'student') {
      let profile = await Student.findOne({ userId: user._id });
      if (!profile) profile = new Student({ userId: user._id, registrationNumber: 'REG-TEMP' });
      if (typeof body.registrationNumber === 'string' && body.registrationNumber) {
        profile.registrationNumber = body.registrationNumber.toUpperCase();
      }
      if (typeof body.btechYear === 'string' && body.btechYear) {
        profile.btechYear = body.btechYear;
      }
      if (typeof body.nfcCardUid === 'string') {
        profile.nfcCardUid = body.nfcCardUid ? body.nfcCardUid.replace(/[\s:]/g, '').toUpperCase() : undefined;
      }
      if (typeof body.deviceToken === 'string' && body.deviceToken) profile.deviceToken = body.deviceToken;
      if (typeof body.isBlocked === 'boolean') profile.isBlocked = body.isBlocked;
      await profile.save(opts);
    } else if (user.role === 'teacher' || user.role === 'hod') {
      let profile = await Teacher.findOne({ userId: user._id });
      if (!profile) profile = new Teacher({ userId: user._id, department: body.department || '' });
      if (typeof body.department === 'string') profile.department = body.department;
      if (typeof body.nfcCardUid === 'string') {
        profile.nfcCardUid = body.nfcCardUid ? body.nfcCardUid.replace(/[\s:]/g, '').toUpperCase() : undefined;
      }
      await profile.save(opts);
    }
    return user;
  });

  res.json({ success: true, user: await attachProfile(result) });
});

/**
 * DELETE /api/v1/users/:id (admin only)
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  // Hierarchy deletion permission enforcement
  if (req.user.role === 'teacher' && user.role !== 'student') {
    throw new ApiError(403, 'Teachers may only delete student accounts', 'FORBIDDEN');
  }
  if (req.user.role === 'hod' && user.role === 'admin') {
    throw new ApiError(403, 'HODs cannot delete admin accounts', 'FORBIDDEN');
  }
  if (req.user.role === 'teacher') {
    await assertTeacherIsMentor(req.user);
  }

  await withTransaction(async (session) => {
    const opts = txOptions(session);

    if (user.role === 'student') await Student.deleteOne({ userId: id }, opts);
    else if (user.role === 'teacher' || user.role === 'hod') await Teacher.deleteOne({ userId: id }, opts);

    await user.deleteOne(opts);
    return user;
  });

  res.json({ success: true });
});

module.exports = { listUsers, getMe, getUser, updateUser, deleteUser };
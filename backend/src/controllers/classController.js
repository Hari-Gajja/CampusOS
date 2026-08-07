const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

/** Resolve the Teacher profile for the current user (teachers only). */
async function requireTeacherProfile(userId) {
  const teacher = await Teacher.findOne({ userId });
  if (!teacher) throw new ApiError(404, 'Teacher profile not found', 'PROFILE_NOT_FOUND');
  return teacher;
}

/** All teacher ids linked to a class: primary teacher, mentor, subject teachers. */
function classTeacherIds(schoolClass) {
  const ids = new Set();
  if (schoolClass.teacherId) ids.add(String(schoolClass.teacherId));
  if (schoolClass.mentorId) ids.add(String(schoolClass.mentorId));
  for (const s of schoolClass.subjects || []) {
    if (s.teacherId) ids.add(String(s.teacherId));
  }
  return [...ids];
}

/**
 * Keep every involved teacher's `assignedClasses` in sync with the
 * teachers actually linked to a class (primary/mentor/subject teachers).
 */
async function syncTeacherAssignments(schoolClassId, keepTeacherIds) {
  const keep = [...new Set(keepTeacherIds.map(String))];
  await Teacher.updateMany(
    { assignedClasses: schoolClassId },
    { $pull: { assignedClasses: schoolClassId } },
  );
  if (keep.length) {
    await Teacher.updateMany(
      { _id: { $in: keep } },
      { $addToSet: { assignedClasses: schoolClassId } },
    );
  }
}

/**
 * Assert the teacher is linked to a class (subject teacher, mentor or
 * primary teacher). Admins and HODs bypass.
 */
async function assertClassAccess(schoolClass, user) {
  if (user.role === 'admin' || user.role === 'hod') return;
  if (user.role === 'student') {
    const student = await Student.findOne({ userId: user.id });
    if (student && (student.enrolledClasses || []).some((c) => String(c) === String(schoolClass._id))) return;
    throw new ApiError(403, 'You are not enrolled in this class', 'FORBIDDEN');
  }
  const teacher = await Teacher.findOne({ userId: user.id });
  if (!teacher) throw new ApiError(403, 'You do not own this class', 'FORBIDDEN');
  if (classTeacherIds(schoolClass).includes(String(teacher._id))) return;
  throw new ApiError(403, 'You are not assigned to this class', 'FORBIDDEN');
}

/**
 * Assert the requester may manage students of a class. In the systematic
 * workflow only the class mentor (plus HOD/admin) can add students.
 */
async function assertCanManageStudents(schoolClass, user) {
  if (user.role === 'admin' || user.role === 'hod') return;
  const teacher = await Teacher.findOne({ userId: user.id });
  if (!teacher || String(schoolClass.mentorId) !== String(teacher._id)) {
    throw new ApiError(
      403,
      'Only the assigned class mentor can add students to this class',
      'MENTOR_ONLY',
    );
  }
}

/**
 * The frontends send teacher ids from /users?role=teacher, which are
 * User document ids, but Class.teacherId / mentorId / subjects.teacherId
 * reference the Teacher collection. Resolve a User id to its Teacher
 * profile id so assignments persist and populate correctly.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @returns {Promise<import('mongoose').Types.ObjectId|null>}
 */
async function resolveTeacherId(id) {
  if (!id) return null;
  const direct = await Teacher.findById(id);
  if (direct) return direct._id;
  const byUser = await Teacher.findOne({ userId: id });
  return byUser ? byUser._id : id;
}

/** Resolve teacher ids inside a subjects array against the Teacher collection. */
async function resolveSubjectTeacherIds(subjects) {
  return Promise.all(
    (subjects || []).map(async (s) => ({
      name: String((s && (s.name || s.subjectName)) || '').trim(),
      code: String((s && (s.code || s.subjectCode)) || '').trim(),
      teacherId: await resolveTeacherId(s && s.teacherId),
      schedule: Array.isArray(s && s.schedule)
        ? s.schedule.map((sc) => ({
            dayOfWeek: Number(sc.dayOfWeek),
            startTime: String(sc.startTime),
            endTime: String(sc.endTime),
          }))
        : [],
    })),
  );
}

/** Normalize an incoming subjects array into subjectSchema-shaped objects. */
function normalizeSubjects(subjects) {
  if (!Array.isArray(subjects)) return [];
  return subjects
    .filter((s) => s && (s.name || s.subjectName) && s.teacherId)
    .map((s) => ({
      name: String(s.name || s.subjectName).trim(),
      code: String(s.code || s.subjectCode || '').trim(),
      teacherId: s.teacherId,
      schedule: Array.isArray(s.schedule) ? s.schedule : [],
    }));
}

/**
 * POST /api/v1/classes
 * Create a class (HOD/admin; teachers only via subject assignment by HOD).
 * Body: { name, room, btechYear, schedule, lateThresholdMinutes,
 *         mentorId, subjects: [{ name, code, teacherId }] }
 */
const createClass = asyncHandler(async (req, res) => {
  const { name, room, btechYear, schedule, lateThresholdMinutes } = req.body;
  const rawSubjects = normalizeSubjects(req.body.subjects);
  const subjects = await resolveSubjectTeacherIds(rawSubjects);

  let teacherId = req.body.teacherId
    ? await resolveTeacherId(req.body.teacherId)
    : null;
  if (!teacherId && subjects.length) {
    teacherId = subjects[0].teacherId;
  }
  let mentorId = req.body.mentorId
    ? await resolveTeacherId(req.body.mentorId)
    : null;
  if (!teacherId && mentorId) {
    teacherId = mentorId;
  }

  const schoolClass = await Class.create({
    name,
    subject: subjects.length ? subjects[0].code || subjects[0].name : (req.body.subject || ''),
    teacherId,
    mentorId: mentorId || null,
    subjects,
    room,
    btechYear: btechYear || 'B.Tech 1st Year',
    schedule: schedule || [],
    lateThresholdMinutes: lateThresholdMinutes ?? 5,
  });

  await syncTeacherAssignments(schoolClass._id, classTeacherIds(schoolClass));

  const populated = await Class.findById(schoolClass._id).populate({
    path: 'teacherId',
    populate: { path: 'userId', select: 'name email' },
  });

  res.status(201).json({ success: true, class: populated });
});

/**
 * GET /api/v1/classes?teacherId=
 * List classes. Teachers see only classes they are linked to (subject
 * teacher, mentor or primary teacher). Admins/HODs see all or filter.
 */
const listClasses = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) throw new ApiError(404, 'Student profile not found', 'PROFILE_NOT_FOUND');
    filter._id = { $in: student.enrolledClasses || [] };
  } else if (req.user.role === 'teacher') {
    const teacher = await requireTeacherProfile(req.user.id);
    filter.$or = [
      { teacherId: teacher._id },
      { mentorId: teacher._id },
      { 'subjects.teacherId': teacher._id },
    ];
  } else if (req.query.teacherId) {
    filter.$or = [
      { teacherId: req.query.teacherId },
      { mentorId: req.query.teacherId },
      { 'subjects.teacherId': req.query.teacherId },
    ];
  }

  const classes = await Class.find(filter)
    .populate([
      { path: 'teacherId', populate: { path: 'userId', select: 'name email' } },
      { path: 'mentorId', populate: { path: 'userId', select: 'name email' } },
      { path: 'subjects.teacherId', populate: { path: 'userId', select: 'name email' } },
    ])
    .sort({ createdAt: -1 });

  let data = classes;
  if (req.user.role === 'teacher') {
    const teacher = await requireTeacherProfile(req.user.id);
    data = classes.map((c) => ({
      ...c.toObject(),
      isMentor: !!(c.mentorId && String(c.mentorId._id || c.mentorId) === String(teacher._id)),
    }));
  }

  res.json({ success: true, classes: data });
});

/**
 * GET /api/v1/classes/:id
 */
const getClass = asyncHandler(async (req, res) => {
  const schoolClass = await Class.findById(req.params.id).populate([
    { path: 'teacherId', populate: { path: 'userId', select: 'name email' } },
    { path: 'mentorId', populate: { path: 'userId', select: 'name email' } },
    { path: 'subjects.teacherId', populate: { path: 'userId', select: 'name email' } },
  ]);
  if (!schoolClass) throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  await assertClassAccess(schoolClass, req.user);

  const enrolled = await Student.find({ enrolledClasses: schoolClass._id })
    .populate('userId', 'name email')
    .select('registrationNumber nfcCardUid');

  res.json({
    success: true,
    class: {
      ...schoolClass.toObject(),
      isMentor: req.user.role === 'teacher'
        ? String(schoolClass.mentorId) === String((await Teacher.findOne({ userId: req.user.id }))?._id || '')
        : undefined,
      enrolledStudents: enrolled,
    },
  });
});

/**
 * PUT /api/v1/classes/:id
 * Admins/HODs may update everything including mentorId, subjects and
 * teacher assignments. Teachers may only update basic class fields.
 */
const updateClass = asyncHandler(async (req, res) => {
  const schoolClass = await Class.findById(req.params.id);
  if (!schoolClass) throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  await assertClassAccess(schoolClass, req.user);

  const { name, subject, room, schedule, lateThresholdMinutes } = req.body;

  if (name !== undefined) schoolClass.name = name;
  if (subject !== undefined) schoolClass.subject = subject;
  if (room !== undefined) schoolClass.room = room;
  if (schedule !== undefined) schoolClass.schedule = schedule;
  if (lateThresholdMinutes !== undefined) schoolClass.lateThresholdMinutes = lateThresholdMinutes;

  if (req.user.role === 'admin' || req.user.role === 'hod') {
    const { mentorId } = req.body;
    if (req.body.subjects !== undefined) {
      const subjects = await resolveSubjectTeacherIds(normalizeSubjects(req.body.subjects));
      schoolClass.subjects = subjects;
      if (subjects.length && req.body.teacherId === undefined) {
        schoolClass.teacherId = subjects[0].teacherId;
        schoolClass.subject = subjects[0].code || subjects[0].name;
      }
    }
    if (mentorId !== undefined) schoolClass.mentorId = mentorId ? await resolveTeacherId(mentorId) : null;
    if (req.body.teacherId !== undefined) {
      schoolClass.teacherId = req.body.teacherId ? await resolveTeacherId(req.body.teacherId) : null;
    }
  }

  await schoolClass.save();
  await syncTeacherAssignments(schoolClass._id, classTeacherIds(schoolClass));

  const populated = await Class.findById(schoolClass._id).populate([
    { path: 'teacherId', populate: { path: 'userId', select: 'name email' } },
    { path: 'mentorId', populate: { path: 'userId', select: 'name email' } },
    { path: 'subjects.teacherId', populate: { path: 'userId', select: 'name email' } },
  ]);
  res.json({ success: true, class: populated });
});

/**
 * DELETE /api/v1/classes/:id
 * Removes the class and cleans up enrollments/assignedClasses.
 */
const deleteClass = asyncHandler(async (req, res) => {
  const schoolClass = await Class.findById(req.params.id);
  if (!schoolClass) throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  await assertClassAccess(schoolClass, req.user);

  await schoolClass.deleteOne();
  await Teacher.updateMany(
    { assignedClasses: schoolClass._id },
    { $pull: { assignedClasses: schoolClass._id } },
  );
  await Student.updateMany(
    { enrolledClasses: schoolClass._id },
    { $pull: { enrolledClasses: schoolClass._id } },
  );

  res.json({ success: true });
});

/**
 * POST /api/v1/classes/:id/enroll
 * Body: { studentIds: string[] } — enrolls students into the class.
 * Only the class mentor (or HOD/admin) may enroll students.
 */
const enrollStudents = asyncHandler(async (req, res) => {
  const schoolClass = await Class.findById(req.params.id);
  if (!schoolClass) throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  await assertCanManageStudents(schoolClass, req.user);

  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new ApiError(400, 'studentIds must be a non-empty array', 'VALIDATION_ERROR');
  }

  const uniqueIds = [...new Set(studentIds.map(String))];
  const students = await Student.find({ _id: { $in: uniqueIds } }).select('_id');
  if (students.length !== uniqueIds.length) {
    throw new ApiError(400, 'One or more student IDs do not exist', 'INVALID_STUDENT_IDS');
  }

  await Student.updateMany(
    { _id: { $in: uniqueIds } },
    { $addToSet: { enrolledClasses: schoolClass._id } },
  );

  res.json({ success: true, enrolled: uniqueIds.length });
});

module.exports = {
  createClass,
  listClasses,
  getClass,
  updateClass,
  deleteClass,
  enrollStudents,
};

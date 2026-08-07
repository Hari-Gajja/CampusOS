require('dotenv').config();

async function seedHod() {
  const { connectDB, disconnectDB } = require('../config/db');
  const User = require('../models/User');
  const Teacher = require('../models/Teacher');

  const email = process.env.HOD_EMAIL || 'hod.cs@university.edu';
  const password = process.env.HOD_PASSWORD || 'hari@2903';
  const name = process.env.HOD_NAME || 'Dr. Alan Turing (HOD)';
  const department = 'Computer Science & Engineering';

  await connectDB(process.env.MONGODB_URI);

  let user = await User.findOne({ email });
  if (user) {
    user.password = password;
    user.role = 'hod';
    await user.save();
    console.log(`[seed] HOD user updated: ${email}`);
  } else {
    user = await User.create({ name, email, password, role: 'hod' });
    console.log(`[seed] HOD user created: ${email}`);
  }

  let teacherProfile = await Teacher.findOne({ userId: user._id });
  if (!teacherProfile) {
    await Teacher.create({ userId: user._id, department });
  } else {
    teacherProfile.department = department;
    await teacherProfile.save();
  }

  await disconnectDB();
}

seedHod().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});

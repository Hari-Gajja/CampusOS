require('dotenv').config();

/**
 * Idempotent admin bootstrap:
 *   npm run seed:admin
 * Creates the admin user from ADMIN_EMAIL / ADMIN_PASSWORD env vars.
 */
async function seedAdmin() {
  const { connectDB, disconnectDB } = require('../config/db');
  const User = require('../models/User');

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Campus Admin';

  if (!email || !password) {
    console.error('[seed] ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  await connectDB(process.env.MONGODB_URI);

  const existing = await User.findOne({ email });
  if (existing) {
    existing.password = password;
    existing.role = 'admin';
    await existing.save();
    console.log(`[seed] Admin updated: ${email}`);
  } else {
    await User.create({ name, email, password, role: 'admin' });
    console.log(`[seed] Admin created: ${email}`);
  }

  await disconnectDB();
}

seedAdmin().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});

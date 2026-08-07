require('dotenv').config();
const http = require('http');

const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { initFirebase } = require('./config/firebase');
const { initSocket } = require('./socket');

const REQUIRED_ENV = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`[boot] Missing required environment variables: ${missing.join(', ')}`);
  console.error('[boot] Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

/**
 * Connect to MongoDB with a few retries before giving up.
 * @param {string} uri
 * @param {number} [attempts=3]
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDBWithRetry(uri, attempts = 3) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await connectDB(uri);
    } catch (err) {
      console.error(`[boot] DB connection attempt ${i}/${attempts} failed: ${err.message}`);
      if (i < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000 * i));
      } else {
        throw err;
      }
    }
  }
  return null;
}

/**
 * Bootstrap the HTTP server, database, Firebase and Socket.IO.
 * @returns {Promise<void>}
 */
async function start() {
  await connectDBWithRetry(process.env.MONGODB_URI);
  initFirebase();

  const server = http.createServer(app);
  initSocket(server, process.env.CORS_ORIGIN);

  const port = Number(process.env.PORT || 5000);
  server.listen(port, () => {
    console.log(`[boot] CampusOS backend listening on http://0.0.0.0:${port} (${process.env.NODE_ENV || 'development'})`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`[boot] ${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  if (err && err.name === 'MongooseServerSelectionError') {
    console.error('[boot] FATAL: could not reach MongoDB.');
    console.error('[boot]   If you are using MongoDB Atlas:');
    console.error('[boot]   1. Open cloud.mongodb.com -> Network Access and make sure your');
    console.error('[boot]      current public IP is on the allowlist (or add 0.0.0.0/0 for dev).');
    console.error('[boot]   2. Verify the MONGODB_URI username/password are correct.');
    console.error('[boot]   3. If you are on a VPN/proxy, disconnect so the whitelisted IP is used.');
  } else {
    console.error('[boot] Fatal error during startup:', err);
  }
  process.exit(1);
});

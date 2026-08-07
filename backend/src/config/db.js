const mongoose = require('mongoose');

/**
 * Connect to MongoDB.
 * @param {string} uri - MongoDB connection string.
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB(uri) {
  if (!uri) throw new Error('MONGODB_URI is not defined in environment');

  mongoose.connection.on('connected', () => {
    console.log(`[db] connected: ${uri.replace(/\/\/.*@/, '//***@')}`);
  });
  mongoose.connection.on('error', (err) => {
    console.error('[db] connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 20000,
      heartbeatFrequencyMS: 10000,
    });
  } catch (err) {
    console.error(`[db] MongoDB connection failed: ${err.message}`);
    throw err;
  }
  return mongoose.connection;
}

/** Disconnect from MongoDB gracefully. @returns {Promise<void>} */
async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = { connectDB, disconnectDB };

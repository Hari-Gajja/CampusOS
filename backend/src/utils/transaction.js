const mongoose = require('mongoose');

/**
 * Execute `fn` inside a MongoDB transaction when the deployment
 * supports it (replica set / Atlas). On standalone servers it falls
 * back to a plain execution so development works out of the box.
 *
 * @param {(session: mongoose.ClientSession|null) => Promise<any>} fn
 *   Inside the callback use `const opts = session ? { session } : {}`
 *   and pass `opts` to mongoose operations to participate in the
 *   transaction.
 * @returns {Promise<any>} The return value of fn.
 */
async function withTransaction(fn) {
  let session = null;
  try {
    session = await mongoose.startSession();
  } catch {
    session = null; // standalone server - transactions unsupported
  }

  if (!session) return fn(null);

  session.startTransaction();
  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * Helper to build mongoose options carrying the transaction session.
 * @param {mongoose.ClientSession|null} session
 * @returns {object}
 */
function txOptions(session) {
  return session ? { session } : {};
}

module.exports = { withTransaction, txOptions };

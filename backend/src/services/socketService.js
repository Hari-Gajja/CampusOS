let io = null;

/** Bind the Socket.IO instance after server creation. @param {import('socket.io').Server} server */
function setIo(server) {
  io = server;
}

/** @returns {import('socket.io').Server} */
function getIo() {
  if (!io) throw new Error('Socket.IO is not initialized yet');
  return io;
}

/** @returns {boolean} */
function isReady() {
  return io !== null;
}

/**
 * Emit to every client in a class room (teachers who joined it).
 * @param {string} classId
 * @param {string} event
 * @param {object} payload
 */
function emitToClass(classId, event, payload) {
  if (!io) return;
  io.to(`class:${classId}`).emit(event, payload);
}

/**
 * Emit to a specific teacher's private room.
 * @param {string} teacherId
 * @param {string} event
 * @param {object} payload
 */
function emitToTeacher(teacherId, event, payload) {
  if (!io) return;
  io.to(`teacher:${teacherId}`).emit(event, payload);
}

/** Emit to all admin sockets. @param {string} event @param {object} payload */
function emitToAdmins(event, payload) {
  if (!io) return;
  io.to('admin').emit(event, payload);
}

module.exports = { setIo, getIo, isReady, emitToClass, emitToTeacher, emitToAdmins };

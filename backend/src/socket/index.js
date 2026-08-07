const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { setIo } = require('../services/socketService');

/**
 * Attach Socket.IO to the HTTP server.
 *
 * Client auth: handshake `auth.token` (or `query.token`) must carry a
 * valid access JWT. Teachers/admins get a private `teacher:<id>` room
 * and may subscribe to live class rooms via the `join_teacher_room`
 * event.
 *
 * Server -> client events:
 *   attendance_update | session_started | session_ended | device_heartbeat
 *
 * @param {import('http').Server} httpServer
 * @param {string} [corsOrigin] - comma separated origins.
 * @returns {import('socket.io').Server}
 */
function initSocket(httpServer, corsOrigin) {
  const origins = (corsOrigin || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  setIo(io);

  // JWT handshake auth
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth && socket.handshake.auth.token) ||
      (socket.handshake.query && socket.handshake.query.token);

    if (!token) return next(new Error('AUTH_REQUIRED'));
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.data.user = { id: payload.sub, role: payload.role };
      return next();
    } catch {
      return next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.data.user;

    if (role === 'teacher' || role === 'admin' || role === 'hod' || role === 'student') {
      socket.join(`user:${id}`);
      if (role === 'admin') socket.join('admin');
      if (role === 'hod') socket.join('hod');
      socket.join(`teacher:${id}`);
      if (role === 'admin') socket.join('admin');

      socket.on('join_teacher_room', (classIds) => {
        if (!Array.isArray(classIds)) return;
        const joined = [];
        for (const classId of classIds) {
          if (typeof classId === 'string' && classId.length) {
            socket.join(`class:${classId}`);
            joined.push(classId);
          }
        }
        socket.emit('rooms_joined', { classIds: joined });
      });
    }

    socket.on('disconnect', () => {});
  });

  return io;
}

module.exports = { initSocket };

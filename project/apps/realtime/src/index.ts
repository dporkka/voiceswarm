import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createLogger } from '@aasop/observability';
import { RoomManager } from './rooms.js';
import { PresenceTracker } from './presence.js';
import { AuthManager } from './auth.js';

const logger = createLogger('realtime-server');

const PORT = parseInt(process.env.REALTIME_PORT || '3001', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

const roomManager = new RoomManager(io);
const presenceTracker = new PresenceTracker(io);
const authManager = new AuthManager(JWT_SECRET);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const user = authManager.verifyToken(token);
    socket.data.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  logger.info({ socketId: socket.id, userId: user.id }, 'Client connected');

  // Join user's personal room
  socket.join(`user:${user.id}`);
  socket.join(`org:${user.orgId}`);

  // Track presence
  presenceTracker.setOnline(socket.id, user);

  // Room management
  socket.on('room:join', (roomId: string, callback) => {
    roomManager.joinRoom(socket, roomId, callback);
  });

  socket.on('room:leave', (roomId: string) => {
    roomManager.leaveRoom(socket, roomId);
  });

  socket.on('room:list', (callback) => {
    roomManager.listRooms(socket, callback);
  });

  // Messaging
  socket.on('message:send', (data: { roomId: string; content: string; type?: string }) => {
    const message = {
      id: `msg_${Date.now()}`,
      roomId: data.roomId,
      sender: { id: user.id, name: user.name || user.email },
      content: data.content,
      type: data.type || 'text',
      timestamp: new Date().toISOString(),
    };

    io.to(data.roomId).emit('message:received', message);
  });

  // Broadcasting
  socket.on('broadcast', (data: { event: string; payload: Record<string, unknown>; roomId?: string }) => {
    const target = data.roomId || `org:${user.orgId}`;
    socket.to(target).emit(data.event, {
      ...data.payload,
      sender: user.id,
      timestamp: new Date().toISOString(),
    });
  });

  // Presence
  socket.on('presence:heartbeat', () => {
    presenceTracker.updateHeartbeat(socket.id);
  });

  socket.on('presence:get', (roomId: string, callback) => {
    const online = presenceTracker.getOnlineInRoom(roomId);
    callback({ online, count: online.length });
  });

  // Typing indicators
  socket.on('typing:start', (roomId: string) => {
    socket.to(roomId).emit('typing:started', { userId: user.id, roomId });
  });

  socket.on('typing:stop', (roomId: string) => {
    socket.to(roomId).emit('typing:stopped', { userId: user.id, roomId });
  });

  // Disconnect
  socket.on('disconnect', (reason) => {
    logger.info({ socketId: socket.id, userId: user.id, reason }, 'Client disconnected');
    presenceTracker.setOffline(socket.id);
    roomManager.handleDisconnect(socket);
  });
});

httpServer.listen(PORT, () => {
  logger.info(`Realtime server listening on port ${PORT}`);
});

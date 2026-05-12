import type { Server, Socket } from 'socket.io';
import { createLogger } from '@aasop/observability';

const logger = createLogger('room-manager');

interface RoomInfo {
  id: string;
  name: string;
  type: 'channel' | 'dm' | 'project' | 'agent';
  participants: Set<string>;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export class RoomManager {
  private rooms = new Map<string, RoomInfo>();

  constructor(private io: Server) {}

  joinRoom(socket: Socket, roomId: string, callback?: (result: { success: boolean; room?: RoomInfo }) => void): void {
    const user = socket.data.user;

    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        name: roomId,
        type: 'channel',
        participants: new Set(),
        createdAt: new Date(),
      };
      this.rooms.set(roomId, room);
    }

    socket.join(roomId);
    room.participants.add(socket.id);

    logger.info({ socketId: socket.id, userId: user.id, roomId }, 'Joined room');

    socket.to(roomId).emit('room:joined', {
      roomId,
      user: { id: user.id, name: user.name || user.email },
      timestamp: new Date().toISOString(),
    });

    callback?.({ success: true, room: { ...room, participants: new Set(Array.from(room.participants)) } as RoomInfo });
  }

  leaveRoom(socket: Socket, roomId: string): void {
    const user = socket.data.user;
    socket.leave(roomId);

    const room = this.rooms.get(roomId);
    if (room) {
      room.participants.delete(socket.id);
      if (room.participants.size === 0 && !room.id.startsWith('org:')) {
        this.rooms.delete(roomId);
      }
    }

    socket.to(roomId).emit('room:left', {
      roomId,
      user: { id: user.id },
      timestamp: new Date().toISOString(),
    });

    logger.info({ socketId: socket.id, userId: user.id, roomId }, 'Left room');
  }

  listRooms(socket: Socket, callback: (rooms: Array<{ id: string; name: string; participantCount: number }>) => void): void {
    const rooms = Array.from(this.rooms.values())
      .filter((r) => socket.rooms.has(r.id))
      .map((r) => ({
        id: r.id,
        name: r.name,
        participantCount: r.participants.size,
      }));
    callback(rooms);
  }

  handleDisconnect(socket: Socket): void {
    for (const room of this.rooms.values()) {
      if (room.participants.has(socket.id)) {
        room.participants.delete(socket.id);
        if (room.participants.size === 0 && !room.id.startsWith('org:')) {
          this.rooms.delete(room.id);
        }
      }
    }
  }

  getRoomInfo(roomId: string): RoomInfo | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): RoomInfo[] {
    return Array.from(this.rooms.values());
  }
}

import type { Server } from 'socket.io';
import { createLogger } from '@aasop/observability';

const logger = createLogger('presence-tracker');

interface PresenceEntry {
  socketId: string;
  userId: string;
  orgId: string;
  name: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastHeartbeat: Date;
  rooms: Set<string>;
}

export class PresenceTracker {
  private presence = new Map<string, PresenceEntry>();
  private checkInterval?: ReturnType<typeof setInterval>;

  constructor(private io: Server) {
    this.startCleanupInterval();
  }

  setOnline(socketId: string, user: { id: string; orgId: string; name?: string; email?: string }): void {
    const existing = this.presence.get(socketId);
    if (existing) {
      existing.status = 'online';
      existing.lastHeartbeat = new Date();
    } else {
      this.presence.set(socketId, {
        socketId,
        userId: user.id,
        orgId: user.orgId,
        name: user.name || user.email || user.id,
        status: 'online',
        lastHeartbeat: new Date(),
        rooms: new Set(),
      });
    }

    this.broadcastPresence(user.orgId);
    logger.debug({ userId: user.id, socketId }, 'User online');
  }

  setOffline(socketId: string): void {
    const entry = this.presence.get(socketId);
    if (entry) {
      entry.status = 'offline';
      this.broadcastPresence(entry.orgId);
      this.presence.delete(socketId);
    }
    logger.debug({ socketId }, 'User offline');
  }

  setStatus(socketId: string, status: PresenceEntry['status']): void {
    const entry = this.presence.get(socketId);
    if (entry) {
      entry.status = status;
      entry.lastHeartbeat = new Date();
      this.broadcastPresence(entry.orgId);
    }
  }

  updateHeartbeat(socketId: string): void {
    const entry = this.presence.get(socketId);
    if (entry) {
      entry.lastHeartbeat = new Date();
      if (entry.status === 'away') {
        entry.status = 'online';
      }
    }
  }

  getOnlineInRoom(roomId: string): Array<{ userId: string; name: string; status: string }> {
    const result: Array<{ userId: string; name: string; status: string }> = [];
    const seen = new Set<string>();

    for (const entry of this.presence.values()) {
      if (entry.status !== 'offline' && !seen.has(entry.userId)) {
        result.push({ userId: entry.userId, name: entry.name, status: entry.status });
        seen.add(entry.userId);
      }
    }

    return result;
  }

  getOnlineInOrg(orgId: string): Array<{ userId: string; name: string; status: string }> {
    const result: Array<{ userId: string; name: string; status: string }> = [];
    const seen = new Set<string>();

    for (const entry of this.presence.values()) {
      if (entry.orgId === orgId && entry.status !== 'offline' && !seen.has(entry.userId)) {
        result.push({ userId: entry.userId, name: entry.name, status: entry.status });
        seen.add(entry.userId);
      }
    }

    return result;
  }

  private broadcastPresence(orgId: string): void {
    const online = this.getOnlineInOrg(orgId);
    this.io.to(`org:${orgId}`).emit('presence:update', { orgId, online, count: online.length });
  }

  private startCleanupInterval(): void {
    this.checkInterval = setInterval(() => {
      const now = Date.now();
      for (const [socketId, entry] of this.presence) {
        if (now - entry.lastHeartbeat.getTime() > 120000) {
          entry.status = 'away';
          this.broadcastPresence(entry.orgId);
        }
        if (now - entry.lastHeartbeat.getTime() > 300000) {
          this.setOffline(socketId);
        }
      }
    }, 30000);
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

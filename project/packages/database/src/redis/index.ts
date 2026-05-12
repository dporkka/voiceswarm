/**
 * Redis client wrapper for caching, sessions, and pub/sub.
 */

import Redis from 'ioredis';

/** Cache TTL values in seconds */
export const CacheTTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86400,
  WEEK: 604800,
} as const;

/** Redis client wrapper */
export class RedisClient {
  private readonly client: Redis;
  private readonly prefix: string;

  constructor(options?: { url?: string; prefix?: string; cluster?: boolean }) {
    this.prefix = options?.prefix ?? 'aasop:';

    if (options?.cluster) {
      this.client = new Redis.Cluster([{ host: 'localhost', port: 6379 }], {
        redisOptions: { password: process.env.REDIS_PASSWORD },
      });
    } else {
      this.client = new Redis(options?.url ?? process.env.REDIS_URL ?? 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });
    }

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  /** Get the raw ioredis client */
  getClient(): Redis {
    return this.client;
  }

  /** Generate a prefixed key */
  private key(key: string): string {
    return `${this.prefix}${key}`;
  }

  /** Get a value by key */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(this.key(key));
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /** Set a value with optional TTL */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(this.key(key), ttlSeconds, serialized);
    } else {
      await this.client.set(this.key(key), serialized);
    }
  }

  /** Delete a key */
  async delete(key: string): Promise<void> {
    await this.client.del(this.key(key));
  }

  /** Delete keys by pattern */
  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(this.key(pattern));
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  /** Check if key exists */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(this.key(key));
    return result === 1;
  }

  /** Get or compute a cached value */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  // ==================== Hash Operations ====================

  /** Get hash field */
  async hget<T>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hget(this.key(key), field);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /** Set hash field */
  async hset(key: string, field: string, value: unknown): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await this.client.hset(this.key(key), field, serialized);
  }

  /** Get all hash fields */
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(this.key(key));
  }

  // ==================== List Operations ====================

  /** Push to a list */
  async lpush(key: string, ...values: unknown[]): Promise<void> {
    const serialized = values.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)));
    await this.client.lpush(this.key(key), ...serialized);
  }

  /** Pop from a list */
  async rpop<T>(key: string): Promise<T | null> {
    const value = await this.client.rpop(this.key(key));
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /** Get list range */
  async lrange<T>(key: string, start = 0, stop = -1): Promise<T[]> {
    const values = await this.client.lrange(this.key(key), start, stop);
    return values.map((v) => {
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as T;
      }
    });
  }

  // ==================== Pub/Sub ====================

  /** Publish a message */
  async publish(channel: string, message: unknown): Promise<void> {
    const serialized = typeof message === 'string' ? message : JSON.stringify(message);
    await this.client.publish(this.key(channel), serialized);
  }

  /** Subscribe to a channel */
  subscribe(channel: string, callback: (message: string) => void): void {
    const subscriber = new Redis(this.client.options as never);
    subscriber.subscribe(this.key(channel));
    subscriber.on('message', (_ch, message) => callback(message));
  }

  // ==================== Rate Limiting ====================

  /** Check rate limit using sliding window */
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const windowKey = this.key(`ratelimit:${key}`);
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    const multi = this.client.multi();
    multi.zremrangebyscore(windowKey, 0, now - windowMs);
    multi.zcard(windowKey);
    multi.zadd(windowKey, now, `${now}-${Math.random()}`);
    multi.pexpire(windowKey, windowMs);

    const results = await multi.exec();
    const currentCount = (results?.[1]?.[1] ?? 0) as number;
    const allowed = currentCount < limit;

    if (!allowed) {
      await this.client.zrem(windowKey, `${now}-${Math.random()}`);
    }

    return {
      allowed,
      remaining: Math.max(0, limit - currentCount - 1),
      resetAt: now + windowMs,
    };
  }

  // ==================== Session ====================

  /** Store a session */
  async setSession(sessionId: string, data: unknown, ttlSeconds = CacheTTL.DAY): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttlSeconds);
  }

  /** Get a session */
  async getSession<T>(sessionId: string): Promise<T | null> {
    return this.get<T>(`session:${sessionId}`);
  }

  /** Delete a session */
  async deleteSession(sessionId: string): Promise<void> {
    await this.delete(`session:${sessionId}`);
  }

  // ==================== Cleanup ====================

  /** Disconnect from Redis */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

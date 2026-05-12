/**
 * Audit logging for security and compliance.
 */

import { z } from 'zod';

/** Audit action categories */
export enum AuditAction {
  // Auth
  LOGIN = 'login',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  TOKEN_REFRESHED = 'token_refreshed',
  PASSWORD_CHANGED = 'password_changed',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',

  // CRUD
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',

  // Actions
  EXECUTE = 'execute',
  DEPLOY = 'deploy',
  APPROVE = 'approve',
  REJECT = 'reject',

  // Security
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMITED = 'rate_limited',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

/** Audit log entry schema */
export const AuditLogEntrySchema = z.object({
  id: z.string().uuid().optional(),
  action: z.nativeEnum(AuditAction),
  resource: z.string().min(1),
  resourceId: z.string(),
  userId: z.string().uuid().nullable(),
  orgId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  metadata: z.record(z.unknown()).default({}),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  timestamp: z.date().default(() => new Date()),
  severity: z.enum(['info', 'warning', 'error', 'critical']).default('info'),
});

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

/** Audit logger configuration */
export interface AuditLoggerConfig {
  bufferSize: number;
  flushIntervalMs: number;
  includeIpAddress: boolean;
  includeUserAgent: boolean;
  sensitiveFields: string[];
}

const DefaultConfig: AuditLoggerConfig = {
  bufferSize: 100,
  flushIntervalMs: 5000,
  includeIpAddress: true,
  includeUserAgent: true,
  sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'key', 'authorization'],
};

/** Audit logger interface */
export interface AuditLogger {
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void;
  logAsync(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
  flush(): Promise<void>;
}

// ==================== Console Audit Logger ====================

/** Simple console-based audit logger for development */
export class ConsoleAuditLogger implements AuditLogger {
  private config: AuditLoggerConfig;

  constructor(config?: Partial<AuditLoggerConfig>) {
    this.config = { ...DefaultConfig, ...config };
  }

  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const fullEntry = this.sanitize({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    });

    console.log('[AUDIT]', JSON.stringify(fullEntry));
  }

  async logAsync(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    this.log(entry);
  }

  async flush(): Promise<void> {
    // No-op for console logger
  }

  private sanitize(entry: AuditLogEntry): AuditLogEntry {
    const sanitized = { ...entry };
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeObject(sanitized.metadata);
    }
    return sanitized;
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.config.sensitiveFields.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
        result[key] = '***REDACTED***';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}

// ==================== Buffered Audit Logger ====================

/** Buffered audit logger that batches writes */
export class BufferedAuditLogger implements AuditLogger {
  private buffer: AuditLogEntry[] = [];
  private config: AuditLoggerConfig;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushHandler: (entries: AuditLogEntry[]) => Promise<void>;

  constructor(
    flushHandler: (entries: AuditLogEntry[]) => Promise<void>,
    config?: Partial<AuditLoggerConfig>,
  ) {
    this.config = { ...DefaultConfig, ...config };
    this.flushHandler = flushHandler;

    // Start flush interval
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushIntervalMs);
  }

  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.buffer.push(fullEntry);

    if (this.buffer.length >= this.config.bufferSize) {
      void this.flush();
    }
  }

  async logAsync(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    this.log(entry);
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const toFlush = [...this.buffer];
    this.buffer = [];

    try {
      await this.flushHandler(toFlush);
    } catch (error) {
      // Re-add entries on failure for retry
      this.buffer.unshift(...toFlush);
      if (this.buffer.length > this.config.bufferSize * 2) {
        // Drop oldest entries if buffer grows too large
        this.buffer = this.buffer.slice(-this.config.bufferSize);
      }
      throw error;
    }
  }

  /** Stop the flush interval */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

// ==================== Audit Log Helpers ====================

/** Create a login audit entry */
export function createLoginAudit(userId: string, orgId: string, success: boolean, metadata?: Record<string, unknown>): Omit<AuditLogEntry, 'id' | 'timestamp'> {
  return {
    action: success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
    resource: 'auth',
    resourceId: userId,
    userId,
    orgId,
    metadata: metadata ?? {},
    ipAddress: null,
    userAgent: null,
    severity: success ? 'info' : 'warning',
  };
}

/** Create a CRUD audit entry */
export function createCrudAudit(
  action: 'create' | 'read' | 'update' | 'delete',
  resource: string,
  resourceId: string,
  userId: string | null,
  orgId: string,
  projectId?: string,
  metadata?: Record<string, unknown>,
): Omit<AuditLogEntry, 'id' | 'timestamp'> {
  return {
    action: AuditAction[action.toUpperCase() as keyof typeof AuditAction],
    resource,
    resourceId,
    userId,
    orgId,
    projectId: projectId ?? null,
    metadata: metadata ?? {},
    ipAddress: null,
    userAgent: null,
    severity: 'info',
  };
}

/** Create a permission denied audit entry */
export function createPermissionDeniedAudit(
  userId: string,
  orgId: string,
  requiredPermission: string,
  resource: string,
  resourceId: string,
): Omit<AuditLogEntry, 'id' | 'timestamp'> {
  return {
    action: AuditAction.PERMISSION_DENIED,
    resource,
    resourceId,
    userId,
    orgId,
    metadata: { requiredPermission },
    ipAddress: null,
    userAgent: null,
    severity: 'warning',
  };
}

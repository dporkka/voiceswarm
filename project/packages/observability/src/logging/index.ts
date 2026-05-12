/**
 * Pino structured logging for AASOP services.
 */

import pino, { type Logger, type LoggerOptions } from 'pino';
import { z } from 'zod';

/** Log level */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** Logger configuration schema */
export const LoggerConfigSchema = z.object({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  service: z.string().default('aasop'),
  version: z.string().default('0.1.0'),
  environment: z.string().default('development'),
  pretty: z.boolean().default(false),
  redactFields: z.array(z.string()).default(['req.headers.authorization', 'password', 'token', 'apiKey', 'secret']),
});

export type LoggerConfig = z.infer<typeof LoggerConfigSchema>;

// ==================== Global Logger ====================

let globalLogger: Logger | null = null;

/** Initialize the global logger */
export function initLogging(config?: Partial<LoggerConfig>): Logger {
  const cfg = LoggerConfigSchema.parse(config);

  const options: LoggerOptions = {
    level: cfg.level,
    name: cfg.service,
    base: {
      service: cfg.service,
      version: cfg.version,
      environment: cfg.environment,
      pid: process.pid,
    },
    redact: {
      paths: cfg.redactFields,
      censor: '[REDACTED]',
    },
  };

  if (cfg.pretty) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    };
  }

  globalLogger = pino(options);
  return globalLogger;
}

/** Get the global logger */
export function getLogger(): Logger {
  if (!globalLogger) {
    return initLogging();
  }
  return globalLogger;
}

/** Create a child logger with additional context */
export function getChildLogger(bindings: Record<string, unknown>): Logger {
  return getLogger().child(bindings);
}

/** Create a service-scoped logger */
export function createServiceLogger(service: string, config?: Partial<LoggerConfig>): Logger {
  const cfg = { ...config, service };
  return initLogging(cfg);
}

/** Reset the global logger (useful for testing) */
export function resetLogger(): void {
  globalLogger = null;
}

// ==================== Request Logging ====================

/** HTTP request log context */
export interface RequestLogContext {
  requestId: string;
  method: string;
  url: string;
  route?: string;
  userId?: string;
  orgId?: string;
  ip?: string;
  userAgent?: string;
}

/** Log an incoming request */
export function logRequest(ctx: RequestLogContext): void {
  const logger = getChildLogger({ requestId: ctx.requestId });
  logger.info(
    {
      req: {
        method: ctx.method,
        url: ctx.url,
        route: ctx.route,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
      userId: ctx.userId,
      orgId: ctx.orgId,
    },
    'Incoming request',
  );
}

/** Log a completed request */
export function logResponse(
  ctx: RequestLogContext,
  statusCode: number,
  durationMs: number,
  error?: Error,
): void {
  const logger = getChildLogger({ requestId: ctx.requestId });
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  logger[level](
    {
      res: {
        statusCode,
        durationMs,
      },
      req: {
        method: ctx.method,
        url: ctx.url,
        route: ctx.route,
      },
      userId: ctx.userId,
      orgId: ctx.orgId,
      err: error,
    },
    'Request completed',
  );
}

// ==================== Structured Event Logging ====================

/** Log an agent event */
export function logAgentEvent(
  event: 'created' | 'updated' | 'state_changed' | 'deleted' | 'task_assigned',
  agentId: string,
  orgId: string,
  details?: Record<string, unknown>,
): void {
  getLogger().info(
    { event: `agent.${event}`, agentId, orgId, ...details },
    `Agent ${event}`,
  );
}

/** Log a task event */
export function logTaskEvent(
  event: 'created' | 'assigned' | 'started' | 'completed' | 'failed' | 'cancelled',
  taskId: string,
  orgId: string,
  details?: Record<string, unknown>,
): void {
  getLogger().info(
    { event: `task.${event}`, taskId, orgId, ...details },
    `Task ${event}`,
  );
}

/** Log a workflow event */
export function logWorkflowEvent(
  event: 'started' | 'step_completed' | 'completed' | 'failed' | 'timed_out',
  workflowId: string,
  orgId: string,
  details?: Record<string, unknown>,
): void {
  getLogger().info(
    { event: `workflow.${event}`, workflowId, orgId, ...details },
    `Workflow ${event}`,
  );
}

/** Log an inference call */
export function logInference(
  provider: string,
  model: string,
  durationMs: number,
  tokensUsed: number,
  success: boolean,
  error?: string,
): void {
  const level = success ? 'info' : 'error';
  getLogger()[level](
    {
      event: 'inference.completed',
      provider,
      model,
      durationMs,
      tokensUsed,
      success,
      error,
    },
    `Inference ${success ? 'completed' : 'failed'}`,
  );
}

/** Log a security event */
export function logSecurityEvent(
  event: 'login' | 'logout' | 'permission_denied' | 'rate_limited' | 'suspicious',
  userId: string,
  orgId: string,
  details?: Record<string, unknown>,
): void {
  getLogger().warn(
    { event: `security.${event}`, userId, orgId, ...details },
    `Security event: ${event}`,
  );
}

// ==================== Error Logging ====================

/** Log an error with full context */
export function logError(
  error: Error,
  context?: {
    requestId?: string;
    userId?: string;
    orgId?: string;
    component?: string;
    operation?: string;
    [key: string]: unknown;
  },
): void {
  getLogger().error(
    {
      err: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...error,
      },
      ...context,
    },
    error.message,
  );
}

/** Log a warning */
export function logWarning(
  message: string,
  context?: Record<string, unknown>,
): void {
  getLogger().warn(context ?? {}, message);
}

/** Log debug information */
export function logDebug(message: string, context?: Record<string, unknown>): void {
  getLogger().debug(context ?? {}, message);
}

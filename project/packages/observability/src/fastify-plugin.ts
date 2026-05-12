/**
 * Fastify instrumentation plugin.
 * Integrates tracing, metrics, and logging with Fastify.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDefaultTracer, withSpan, recordSpanError } from './tracing/index.js';
import { recordHttpRequest, httpRequestTotal, httpRequestDuration, activeConnections } from './metrics/index.js';
import { logRequest, logResponse, getChildLogger, logError } from './logging/index.js';
import { SpanStatusCode } from '@opentelemetry/api';

/** Fastify plugin options */
export interface InstrumentationPluginOptions {
  service: string;
  skipRoutes?: string[];
  logBodies?: boolean;
  maxBodyLogLength?: number;
}

/** Default plugin options */
const defaults: InstrumentationPluginOptions = {
  service: 'aasop',
  skipRoutes: ['/health', '/metrics', '/ready'],
  logBodies: false,
  maxBodyLogLength: 1000,
};

/**
 * Register instrumentation on a Fastify instance.
 * This should be called as the first plugin.
 */
export async function registerInstrumentation(
  fastify: FastifyInstance,
  options: Partial<InstrumentationPluginOptions> = {},
): Promise<void> {
  const opts = { ...defaults, ...options };

  // Add request ID to each request if not present
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.id as string;
    reply.header('x-request-id', requestId);

    // Increment active connections
    activeConnections().inc({ service: opts.service });

    // Log incoming request
    logRequest({
      requestId,
      method: request.method,
      url: request.url,
      route: request.routerPath ?? request.url,
      userId: (request as unknown as Record<string, string>).userId,
      orgId: (request as unknown as Record<string, string>).orgId,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  });

  // Trace request execution
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const route = request.routerPath ?? request.url;

    if (opts.skipRoutes?.includes(route)) return;

    const tracer = getDefaultTracer();
    const span = tracer.startSpan('http_request', {
      attributes: {
        'http.method': request.method,
        'http.route': route,
        'http.url': request.url,
        'http.target': request.url,
        'http.host': request.hostname,
        'http.scheme': request.protocol,
        'http.request_id': request.id,
        'http.user_id': (request as unknown as Record<string, string>).userId,
        'http.org_id': (request as unknown as Record<string, string>).orgId,
        'service.name': opts.service,
      },
    });

    // Store span on request for later use
    (request as unknown as Record<string, unknown>)._span = span;
  });

  // Handle response
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply) => {
    // Nothing to do here, just pass through
  });

  // Log response and record metrics
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.id as string;
    const route = request.routerPath ?? request.url;
    const statusCode = reply.statusCode;
    const durationMs = reply.elapsedTime;

    // Decrement active connections
    activeConnections().dec({ service: opts.service });

    // Skip instrumentation routes
    if (opts.skipRoutes?.includes(route)) return;

    // Record metrics
    recordHttpRequest(request.method, route, statusCode, durationMs, opts.service);
    httpRequestTotal().inc({
      method: request.method,
      route,
      status_code: String(statusCode),
      service: opts.service,
    });
    httpRequestDuration().observe(
      { method: request.method, route, status_code: String(statusCode), service: opts.service },
      durationMs / 1000,
    );

    // Complete tracing span
    const span = (request as unknown as Record<string, unknown>)._span as
      | import('@opentelemetry/api').Span
      | undefined;
    if (span) {
      span.setAttributes({
        'http.status_code': statusCode,
        'http.response.duration_ms': durationMs,
      });

      if (statusCode >= 500) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${statusCode}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      span.end();
    }

    // Log response
    logResponse(
      {
        requestId,
        method: request.method,
        url: request.url,
        route,
        userId: (request as unknown as Record<string, string>).userId,
        orgId: (request as unknown as Record<string, string>).orgId,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
      statusCode,
      durationMs,
    );
  });

  // Handle errors
  fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    const requestId = request.id as string;
    const route = request.routerPath ?? request.url;

    logError(error, {
      requestId,
      route,
      method: request.method,
      url: request.url,
      userId: (request as unknown as Record<string, string>).userId,
      orgId: (request as unknown as Record<string, string>).orgId,
    });

    // Record error on span
    const span = (request as unknown as Record<string, unknown>)._span as
      | import('@opentelemetry/api').Span
      | undefined;
    if (span) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  });

  // Add /metrics endpoint
  fastify.get('/metrics', async (_request: FastifyRequest, reply: FastifyReply) => {
    const { getRegistry } = await import('./metrics/index.js');
    const registry = getRegistry();
    const metrics = await registry.metrics();
    reply.header('Content-Type', registry.contentType);
    return metrics;
  });

  // Add /health endpoint
  fastify.get('/health', async (_request: FastifyRequest, _reply: FastifyReply) => {
    return { status: 'ok', service: opts.service, timestamp: new Date().toISOString() };
  });

  // Add /ready endpoint
  fastify.get('/ready', async (_request: FastifyRequest, _reply: FastifyReply) => {
    return { status: 'ready', service: opts.service, timestamp: new Date().toISOString() };
  });
}

// ==================== Fastify Plugin Registration Helper ====================

/** Fastify-compatible plugin export */
export default async function instrumentationPlugin(
  fastify: FastifyInstance,
  options: Partial<InstrumentationPluginOptions>,
): Promise<void> {
  await registerInstrumentation(fastify, options);
}

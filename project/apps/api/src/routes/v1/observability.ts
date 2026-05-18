// @ts-nocheck
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const tracesQuerySchema = z.object({
  service: z.string().optional(),
  operation: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  minDuration: z.number().int().optional(),
});

const logsQuerySchema = z.object({
  service: z.string().optional(),
  level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  query: z.string().optional(),
});

const traces: any[] = [];
const logs: any[] = [];

export async function observabilityRoutes(app: FastifyInstance) {
  app.get('/traces', {
    schema: { tags: ['observability'], summary: 'Query traces', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('observability:read')],
  }, async (req, reply) => {
    const body = tracesQuerySchema.safeParse(req.query);
    const params = body.success ? body.data : {};
    const result = traces.filter((t) => {
      if (params.service && t.service !== params.service) return false;
      if (params.operation && t.operation !== params.operation) return false;
      if (params.minDuration && t.duration < params.minDuration) return false;
      return true;
    }).slice(0, params.limit || 100);

    return reply.send({ traces: result, total: result.length });
  });

  app.post('/traces', {
    schema: { tags: ['observability'], summary: 'Ingest trace', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('observability:read')],
  }, async (req, reply) => {
    const trace = req.body as Record<string, unknown>;
    traces.push({
      ...trace,
      id: `trace_${traces.length + 1}`,
      timestamp: new Date().toISOString(),
    });
    return reply.status(201).send({ id: traces[traces.length - 1].id });
  });

  app.get('/metrics', {
    schema: { tags: ['observability'], summary: 'Get metrics', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('observability:read')],
  }, async (req, reply) => {
    const { service } = req.query as { service?: string };
    return reply.send({
      service: service || 'all',
      metrics: {
        requestsPerMinute: Math.floor(Math.random() * 500) + 50,
        avgLatencyMs: Math.floor(Math.random() * 200) + 20,
        errorRate: Math.random() * 0.05,
        activeConnections: Math.floor(Math.random() * 100),
        memoryUsageMB: Math.floor(Math.random() * 1024) + 256,
        cpuUsagePercent: Math.random() * 80,
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/logs', {
    schema: { tags: ['observability'], summary: 'Query logs', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('observability:read')],
  }, async (req, reply) => {
    const body = logsQuerySchema.safeParse(req.query);
    const params = body.success ? body.data : {};
    const result = logs.filter((l) => {
      if (params.service && l.service !== params.service) return false;
      if (params.level && l.level !== params.level) return false;
      if (params.query && !l.message?.includes(params.query)) return false;
      return true;
    }).slice(0, params.limit || 100);

    return reply.send({ logs: result, total: result.length });
  });

  app.post('/logs', {
    schema: { tags: ['observability'], summary: 'Ingest log', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const logEntry = req.body as Record<string, unknown>;
    logs.push({
      ...logEntry,
      id: `log_${logs.length + 1}`,
      timestamp: new Date().toISOString(),
    });
    return reply.status(201).send({ id: logs[logs.length - 1].id });
  });
}

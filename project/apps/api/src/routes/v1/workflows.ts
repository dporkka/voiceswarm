import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { WorkflowService } from '../../services/workflow-service.js';

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  definition: z.object({
    type: z.string(),
    steps: z.array(z.object({
      id: z.string(),
      type: z.string(),
      config: z.record(z.unknown()),
      dependsOn: z.array(z.string()).optional(),
    })),
  }),
  input: z.record(z.unknown()).optional(),
  projectId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const signalSchema = z.object({
  signal: z.string(),
  payload: z.record(z.unknown()).optional(),
});

export async function workflowRoutes(app: FastifyInstance) {
  const service = new WorkflowService();

  app.get('/', {
    schema: { tags: ['workflows'], summary: 'List workflows', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { page, limit } = req.query as Record<string, string>;
    const result = await service.list({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      orgId: req.user!.orgId,
    });
    return reply.send(result);
  });

  app.post('/', {
    schema: { tags: ['workflows'], summary: 'Create workflow', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('workflows:write')],
  }, async (req, reply) => {
    const body = createWorkflowSchema.parse(req.body);
    const workflow = await service.create(body, req.user!.orgId);
    return reply.status(201).send(workflow);
  });

  app.get('/:id', {
    schema: { tags: ['workflows'], summary: 'Get workflow', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const workflow = await service.get(id, req.user!.orgId);
    return reply.send(workflow);
  });

  app.post('/:id/signal', {
    schema: { tags: ['workflows'], summary: 'Signal workflow', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('workflows:write')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = signalSchema.parse(req.body);
    const workflow = await service.signal(id, body, req.user!.orgId);
    return reply.send(workflow);
  });

  app.post('/:id/cancel', {
    schema: { tags: ['workflows'], summary: 'Cancel workflow', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('workflows:write')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { reason } = req.body as { reason?: string } | undefined;
    const workflow = await service.cancel(id, reason, req.user!.orgId);
    return reply.send(workflow);
  });
}

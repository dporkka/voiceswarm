import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TaskService } from '../../services/task-service.js';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(['code', 'review', 'test', 'deploy', 'research', 'document', 'custom']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  projectId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  result: z.record(z.unknown()).optional(),
});

export async function taskRoutes(app: FastifyInstance) {
  const service = new TaskService();

  app.get('/', {
    schema: {
      tags: ['tasks'],
      summary: 'List tasks',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { page, limit, status, projectId } = req.query as Record<string, string>;
    const result = await service.list({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      projectId,
      orgId: req.user!.orgId,
    });
    return reply.send(result);
  });

  app.post('/', {
    schema: { tags: ['tasks'], summary: 'Create task', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('tasks:write')],
  }, async (req, reply) => {
    const body = createTaskSchema.parse(req.body);
    const task = await service.create(body, req.user!.orgId);
    return reply.status(201).send(task);
  });

  app.get('/:id', {
    schema: { tags: ['tasks'], summary: 'Get task', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await service.get(id, req.user!.orgId);
    return reply.send(task);
  });

  app.patch('/:id', {
    schema: { tags: ['tasks'], summary: 'Update task', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('tasks:write')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = updateTaskSchema.parse(req.body);
    const task = await service.update(id, body, req.user!.orgId);
    return reply.send(task);
  });

  app.post('/:id/assign', {
    schema: { tags: ['tasks'], summary: 'Assign task to agent', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('tasks:write')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { agentId } = req.body as { agentId: string };
    const task = await service.assign(id, agentId, req.user!.orgId);
    return reply.send(task);
  });

  app.post('/:id/complete', {
    schema: { tags: ['tasks'], summary: 'Complete task', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('tasks:write')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown> | undefined;
    const task = await service.complete(id, body, req.user!.orgId);
    return reply.send(task);
  });
}

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AgentService } from '../../services/agent-service.js';

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  config: z.object({
    model: z.string().optional(),
    systemPrompt: z.string().optional(),
    tools: z.array(z.string()).optional(),
    maxIterations: z.number().int().min(1).max(100).optional(),
    memoryEnabled: z.boolean().optional(),
    sandboxEnabled: z.boolean().optional(),
    allowedSkills: z.array(z.string()).optional(),
  }),
  projectId: z.string().uuid().optional(),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  config: z.object({
    model: z.string().optional(),
    systemPrompt: z.string().optional(),
    tools: z.array(z.string()).optional(),
    maxIterations: z.number().int().min(1).max(100).optional(),
    memoryEnabled: z.boolean().optional(),
    sandboxEnabled: z.boolean().optional(),
  }).optional(),
  status: z.enum(['idle', 'active', 'paused', 'error', 'terminated']).optional(),
});

const executeSchema = z.record(z.unknown());

export async function agentRoutes(app: FastifyInstance) {
  const service = new AgentService();

  app.get('/', {
    schema: {
      tags: ['agents'],
      summary: 'List agents',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          status: { type: 'string' },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { page, limit, status } = req.query as Record<string, string>;
    const result = await service.list({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      orgId: req.user!.orgId,
    });
    return reply.send(result);
  });

  app.post('/', {
    schema: { tags: ['agents'], summary: 'Create agent', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('agents:write')],
  }, async (req, reply) => {
    const body = createAgentSchema.parse(req.body);
    const agent = await service.create(body, req.user!.orgId);
    return reply.status(201).send(agent);
  });

  app.get('/:id', {
    schema: { tags: ['agents'], summary: 'Get agent', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = await service.get(id, req.user!.orgId);
    return reply.send(agent);
  });

  app.patch('/:id', {
    schema: { tags: ['agents'], summary: 'Update agent', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('agents:write')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = updateAgentSchema.parse(req.body);
    const agent = await service.update(id, body, req.user!.orgId);
    return reply.send(agent);
  });

  app.delete('/:id', {
    schema: { tags: ['agents'], summary: 'Delete agent', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('agents:write')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await service.delete(id, req.user!.orgId);
    return reply.status(204).send();
  });

  app.post('/:id/execute', {
    schema: { tags: ['agents'], summary: 'Execute agent', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('agents:execute')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = executeSchema.parse(req.body);
    const result = await service.execute(id, body, req.user!.orgId);
    return reply.send(result);
  });

  app.post('/:id/pause', {
    schema: { tags: ['agents'], summary: 'Pause agent', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('agents:execute')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = await service.pause(id, req.user!.orgId);
    return reply.send(agent);
  });

  app.post('/:id/resume', {
    schema: { tags: ['agents'], summary: 'Resume agent', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('agents:execute')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = await service.resume(id, req.user!.orgId);
    return reply.send(agent);
  });

  app.post('/:id/cancel', {
    schema: { tags: ['agents'], summary: 'Cancel agent', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('agents:execute')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = await service.cancel(id, req.user!.orgId);
    return reply.send(agent);
  });
}

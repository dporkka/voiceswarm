import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const storeSchema = z.object({
  content: z.string().min(1).max(10000),
  type: z.enum(['fact', 'conversation', 'code', 'document', 'task', 'observation']).optional(),
  metadata: z.record(z.unknown()).optional(),
  projectId: z.string().optional(),
  agentId: z.string().optional(),
  taskId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  importance: z.number().min(0).max(1).optional(),
});

const searchSchema = z.object({
  query: z.string().min(1).max(2000),
  projectId: z.string().optional(),
  agentId: z.string().optional(),
  type: z.string().optional(),
  topK: z.number().int().min(1).max(50).optional(),
  minScore: z.number().min(0).max(1).optional(),
});

const memories = new Map<string, any>();
let memCounter = 0;

export async function memoryRoutes(app: FastifyInstance) {
  app.post('/search', {
    schema: { tags: ['memory'], summary: 'Search memories', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('memory:read')],
  }, async (req, reply) => {
    const body = searchSchema.parse(req.body);
    const allMemories = Array.from(memories.values()).filter(
      (m) => m.orgId === req.user!.orgId
    );

    const results = allMemories
      .filter((m) => {
        if (body.projectId && m.projectId !== body.projectId) return false;
        if (body.agentId && m.agentId !== body.agentId) return false;
        if (body.type && m.type !== body.type) return false;
        return m.content.toLowerCase().includes(body.query.toLowerCase());
      })
      .slice(0, body.topK || 10)
      .map((m) => ({
        entry: m,
        score: Math.random() * 0.5 + 0.5,
        distance: Math.random() * 0.5,
      }));

    return reply.send({ results, total: results.length });
  });

  app.post('/store', {
    schema: { tags: ['memory'], summary: 'Store memory', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('memory:write')],
  }, async (req, reply) => {
    const body = storeSchema.parse(req.body);
    const id = `mem_${++memCounter}_${Date.now()}`;
    const entry = {
      id,
      ...body,
      type: body.type || 'fact',
      orgId: req.user!.orgId,
      timestamp: new Date().toISOString(),
    };
    memories.set(id, entry);
    return reply.status(201).send(entry);
  });

  app.get('/:id', {
    schema: { tags: ['memory'], summary: 'Get memory', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('memory:read')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const memory = memories.get(id);
    if (!memory || memory.orgId !== req.user!.orgId) {
      return reply.status(404).send({ error: 'NotFound', message: 'Memory not found' });
    }
    return reply.send(memory);
  });
}

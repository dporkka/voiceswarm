import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  config: z.record(z.unknown()).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  config: z.record(z.unknown()).optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
});

const projects = new Map<string, any>();
let counter = 0;

export async function projectRoutes(app: FastifyInstance) {
  app.get('/', {
    schema: { tags: ['projects'], summary: 'List projects', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const all = Array.from(projects.values()).filter(
      (p) => p.orgId === req.user!.orgId
    );
    return reply.send({
      items: all,
      total: all.length,
      page: 1,
      limit: all.length,
    });
  });

  app.post('/', {
    schema: { tags: ['projects'], summary: 'Create project', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('projects:write')],
  }, async (req, reply) => {
    const body = createProjectSchema.parse(req.body);
    const id = `proj_${++counter}`;
    const project = {
      id,
      ...body,
      orgId: req.user!.orgId,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projects.set(id, project);
    return reply.status(201).send(project);
  });

  app.get('/:id', {
    schema: { tags: ['projects'], summary: 'Get project', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = projects.get(id);
    if (!project || project.orgId !== req.user!.orgId) {
      return reply.status(404).send({ error: 'NotFound', message: 'Project not found' });
    }
    return reply.send(project);
  });

  app.patch('/:id', {
    schema: { tags: ['projects'], summary: 'Update project', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('projects:write')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = projects.get(id);
    if (!existing || existing.orgId !== req.user!.orgId) {
      return reply.status(404).send({ error: 'NotFound', message: 'Project not found' });
    }
    const body = updateProjectSchema.parse(req.body);
    const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
    projects.set(id, updated);
    return reply.send(updated);
  });

  app.delete('/:id', {
    schema: { tags: ['projects'], summary: 'Delete project', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('projects:write')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = projects.get(id);
    if (!existing || existing.orgId !== req.user!.orgId) {
      return reply.status(404).send({ error: 'NotFound', message: 'Project not found' });
    }
    existing.status = 'deleted';
    existing.updatedAt = new Date().toISOString();
    return reply.status(204).send();
  });
}

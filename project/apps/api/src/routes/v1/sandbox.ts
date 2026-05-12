import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const createSchema = z.object({
  image: z.string().min(1),
  command: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  memoryLimit: z.string().optional(),
  cpuLimit: z.string().optional(),
  networkEnabled: z.boolean().optional(),
  timeoutMs: z.number().int().optional(),
  files: z.record(z.string()).optional(),
});

const execSchema = z.object({
  command: z.string().min(1),
  timeout: z.number().int().optional(),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),
  stdin: z.string().optional(),
});

const sandboxes = new Map<string, any>();
let sbCounter = 0;

export async function sandboxRoutes(app: FastifyInstance) {
  app.post('/', {
    schema: { tags: ['sandbox'], summary: 'Create sandbox', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('sandbox:execute')],
  }, async (req, reply) => {
    const body = createSchema.parse(req.body);
    const id = `sb_${++sbCounter}_${Date.now()}`;
    const sandbox = {
      id,
      containerId: `container_${id}`,
      ...body,
      orgId: req.user!.orgId,
      status: 'running',
      createdAt: new Date().toISOString(),
    };
    sandboxes.set(id, sandbox);
    return reply.status(201).send(sandbox);
  });

  app.post('/:id/exec', {
    schema: { tags: ['sandbox'], summary: 'Execute in sandbox', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('sandbox:execute')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const sandbox = sandboxes.get(id);
    if (!sandbox || sandbox.orgId !== req.user!.orgId) {
      return reply.status(404).send({ error: 'NotFound', message: 'Sandbox not found' });
    }
    const body = execSchema.parse(req.body);
    const result = {
      exitCode: 0,
      stdout: `Executed: ${body.command}`,
      stderr: '',
      duration: 100,
      memoryUsage: 1024000,
    };
    return reply.send(result);
  });

  app.delete('/:id', {
    schema: { tags: ['sandbox'], summary: 'Destroy sandbox', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('sandbox:execute')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const sandbox = sandboxes.get(id);
    if (!sandbox || sandbox.orgId !== req.user!.orgId) {
      return reply.status(404).send({ error: 'NotFound', message: 'Sandbox not found' });
    }
    sandbox.status = 'stopped';
    sandbox.stoppedAt = new Date().toISOString();
    return reply.status(204).send();
  });
}

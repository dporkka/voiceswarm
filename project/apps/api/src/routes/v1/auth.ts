// @ts-nocheck
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
  orgName: z.string().min(1).max(100).optional(),
});

const users = new Map<string, any>();
const orgs = new Map<string, any>();

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', {
    schema: {
      tags: ['auth'],
      summary: 'Login',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
      },
    },
  }, async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const user = Array.from(users.values()).find((u: any) => u.email === body.email);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    const token = app.jwt.sign({
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
      role: user.role,
      permissions: user.permissions,
    });

    return reply.send({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  app.post('/register', {
    schema: {
      tags: ['auth'],
      summary: 'Register',
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string' },
          orgName: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const body = registerSchema.parse(req.body);

    const existing = Array.from(users.values()).find((u: any) => u.email === body.email);
    if (existing) {
      return reply.status(409).send({ error: 'Conflict', message: 'Email already registered' });
    }

    const orgId = `org_${Date.now()}`;
    orgs.set(orgId, {
      id: orgId,
      name: body.orgName || body.name + "'s Org",
      createdAt: new Date().toISOString(),
    });

    const userId = `user_${Date.now()}`;
    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = {
      id: userId,
      email: body.email,
      name: body.name,
      passwordHash,
      orgId,
      role: 'admin',
      permissions: ['admin'],
      createdAt: new Date().toISOString(),
    };
    users.set(userId, user);

    const token = app.jwt.sign({
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
      role: user.role,
      permissions: user.permissions,
    });

    return reply.status(201).send({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  });

  app.get('/me', {
    schema: { tags: ['auth'], summary: 'Get current user', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    return reply.send({
      id: req.user!.id,
      email: req.user!.email,
      orgId: req.user!.orgId,
      role: req.user!.role,
    });
  });

  app.post('/refresh', {
    schema: { tags: ['auth'], summary: 'Refresh token', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const token = app.jwt.sign({
      sub: req.user!.id,
      email: req.user!.email,
      orgId: req.user!.orgId,
      role: req.user!.role,
      permissions: req.user!.permissions,
    });
    return reply.send({ token });
  });
}

// @ts-nocheck
import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    checkPermission: (permission: string) => preHandlerHookHandler;
    checkRole: (...roles: string[]) => preHandlerHookHandler;
  }
}

export const PERMISSIONS = {
  AGENTS_READ: 'agents:read',
  AGENTS_WRITE: 'agents:write',
  AGENTS_EXECUTE: 'agents:execute',
  TASKS_READ: 'tasks:read',
  TASKS_WRITE: 'tasks:write',
  WORKFLOWS_READ: 'workflows:read',
  WORKFLOWS_WRITE: 'workflows:write',
  PROJECTS_READ: 'projects:read',
  PROJECTS_WRITE: 'projects:write',
  MEMORY_READ: 'memory:read',
  MEMORY_WRITE: 'memory:write',
  SANDBOX_READ: 'sandbox:read',
  SANDBOX_EXECUTE: 'sandbox:execute',
  INFERENCE_READ: 'inference:read',
  INFERENCE_EXECUTE: 'inference:execute',
  OBSERVABILITY_READ: 'observability:read',
  ADMIN: 'admin',
} as const;

export const ROLES = {
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  VIEWER: 'viewer',
  AGENT: 'agent',
} as const;

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.DEVELOPER]: [
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.AGENTS_WRITE,
    PERMISSIONS.AGENTS_EXECUTE,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_WRITE,
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_WRITE,
    PERMISSIONS.MEMORY_READ,
    PERMISSIONS.MEMORY_WRITE,
    PERMISSIONS.SANDBOX_READ,
    PERMISSIONS.SANDBOX_EXECUTE,
    PERMISSIONS.INFERENCE_READ,
    PERMISSIONS.INFERENCE_EXECUTE,
    PERMISSIONS.OBSERVABILITY_READ,
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.MEMORY_READ,
    PERMISSIONS.OBSERVABILITY_READ,
  ],
  [ROLES.AGENT]: [
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.AGENTS_EXECUTE,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_WRITE,
    PERMISSIONS.MEMORY_READ,
    PERMISSIONS.MEMORY_WRITE,
    PERMISSIONS.SANDBOX_EXECUTE,
    PERMISSIONS.INFERENCE_EXECUTE,
  ],
};

export const rbacPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('checkPermission', (permission: string): preHandlerHookHandler => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      if (!req.user) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
      }
      if (!req.user.permissions.includes(permission) && !req.user.permissions.includes(PERMISSIONS.ADMIN)) {
        return reply.status(403).send({ error: 'Forbidden', message: `Missing permission: ${permission}` });
      }
    };
  });

  app.decorate('checkRole', (...roles: string[]): preHandlerHookHandler => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      if (!req.user) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
      }
      if (!roles.includes(req.user.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: `Requires one of roles: ${roles.join(', ')}` });
      }
    };
  });
});

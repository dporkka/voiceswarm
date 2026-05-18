// @ts-nocheck
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { createLogger } from '@aasop/observability';

import { authPlugin } from './plugins/auth.js';
import { rbacPlugin } from './plugins/rbac.js';
import { errorPlugin } from './plugins/error.js';
import { openapiPlugin } from './plugins/openapi.js';

import { agentRoutes } from './routes/v1/agents.js';
import { taskRoutes } from './routes/v1/tasks.js';
import { workflowRoutes } from './routes/v1/workflows.js';
import { projectRoutes } from './routes/v1/projects.js';
import { memoryRoutes } from './routes/v1/memory.js';
import { sandboxRoutes } from './routes/v1/sandbox.js';
import { inferenceRoutes } from './routes/v1/inference.js';
import { authRoutes } from './routes/v1/auth.js';
import { observabilityRoutes } from './routes/v1/observability.js';

const logger = createLogger('fastify-server');

export async function createServer() {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    connectionTimeout: 30000,
    keepAliveTimeout: 60000,
  });

  // Core plugins
  await app.register(errorPlugin);
  await app.register(cors, { origin: true, credentials: true });
  await app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.user?.id || req.ip,
  });

  // Documentation
  await app.register(openapiPlugin);
  await app.register(swagger, app.swaggerConfig);
  await app.register(swaggerUi, { routePrefix: '/docs' });

  // Auth & RBAC
  await app.register(authPlugin);
  await app.register(rbacPlugin);

  // API Routes v1
  await app.register(async (instance) => {
    await instance.register(agentRoutes, { prefix: '/v1/agents' });
    await instance.register(taskRoutes, { prefix: '/v1/tasks' });
    await instance.register(workflowRoutes, { prefix: '/v1/workflows' });
    await instance.register(projectRoutes, { prefix: '/v1/projects' });
    await instance.register(memoryRoutes, { prefix: '/v1/memory' });
    await instance.register(sandboxRoutes, { prefix: '/v1/sandbox' });
    await instance.register(inferenceRoutes, { prefix: '/v1/inference' });
    await instance.register(authRoutes, { prefix: '/v1/auth' });
    await instance.register(observabilityRoutes, { prefix: '/v1/observability' });
  }, { prefix: '' });

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
  app.get('/ready', async () => ({ status: 'ready', timestamp: new Date().toISOString() }));

  return app;
}

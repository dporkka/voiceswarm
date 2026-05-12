import fp from 'fastify-plugin';
import type { FastifyInstance, FastifySwaggerOptions } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    swaggerConfig: FastifySwaggerOptions;
  }
}

export const openapiPlugin = fp(async (app: FastifyInstance) => {
  app.swaggerConfig = {
    swagger: {
      info: {
        title: 'AASOP API',
        description: 'Autonomous Agentic Software Organization Platform API',
        version: '1.0.0',
        contact: { name: 'AASOP Team', email: 'team@aasop.dev' },
      },
      externalDocs: {
        url: 'https://docs.aasop.dev',
        description: 'Documentation',
      },
      host: process.env.API_HOST || 'localhost:8080',
      schemes: ['https', 'http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'agents', description: 'Agent management' },
        { name: 'tasks', description: 'Task management' },
        { name: 'workflows', description: 'Workflow orchestration' },
        { name: 'projects', description: 'Project management' },
        { name: 'memory', description: 'Memory operations' },
        { name: 'sandbox', description: 'Sandbox management' },
        { name: 'inference', description: 'LLM inference' },
        { name: 'auth', description: 'Authentication' },
        { name: 'observability', description: 'Observability' },
      ],
      securityDefinitions: {
        bearerAuth: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'Bearer token authentication',
        },
      },
    },
  };
});

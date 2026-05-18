// @ts-nocheck
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { createLogger } from '@aasop/observability';

const logger = createLogger('error-handler');

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export const errorPlugin = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof APIError) {
      logger.warn(
        { code: error.code, statusCode: error.statusCode, path: request.url, message: error.message },
        'API error'
      );
      return reply.status(error.statusCode).send(error.toJSON());
    }

    if (error.validation) {
      logger.warn(
        { path: request.url, errors: error.validation },
        'Validation error'
      );
      return reply.status(400).send({
        error: 'ValidationError',
        message: error.message,
        statusCode: 400,
        details: error.validation,
      });
    }

    logger.error(
      { err: error, path: request.url, method: request.method },
      'Unhandled error'
    );

    return reply.status(500).send({
      error: 'InternalServerError',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      statusCode: 500,
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'NotFound',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
    });
  });
});

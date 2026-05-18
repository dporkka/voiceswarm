// @ts-nocheck
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Module augmentation for Fastify
import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      orgId: string;
      role: string;
      permissions: string[];
    };
  }
}

export interface JWTPayload {
  sub: string;
  email: string;
  orgId: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);
    const decoded = await req.jwtVerify<JWTPayload>();
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      orgId: decoded.orgId,
      role: decoded.role,
      permissions: decoded.permissions,
    };
  } catch {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

export async function optionalAuth(req: FastifyRequest) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return;

    const decoded = await req.jwtVerify<JWTPayload>();
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      orgId: decoded.orgId,
      role: decoded.role,
      permissions: decoded.permissions,
    };
  } catch {
    // optional, do nothing
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  const secret = process.env.JWT_SECRET || 'development-secret-change-me';

  await app.register(jwt, {
    secret,
    decode: { complete: false },
    sign: { expiresIn: '24h', issuer: 'aasop-api' },
    verify: { clockTolerance: 60, issuer: 'aasop-api' },
  });

  app.decorate('authenticate', authenticate);
  app.decorate('optionalAuth', optionalAuth);
});

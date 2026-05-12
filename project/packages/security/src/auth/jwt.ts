/**
 * JWT token creation and verification.
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { z } from 'zod';

/** JWT token payload schema */
export const TokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  orgId: z.string().uuid(),
  role: z.string(),
  permissions: z.array(z.string()).default([]),
  type: z.enum(['access', 'refresh', 'service']),
  jti: z.string(),
  iat: z.number(),
  exp: z.number(),
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

/** Token pair for authentication */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

// ==================== Configuration ====================

interface JwtConfig {
  secret: Uint8Array;
  issuer: string;
  audience: string;
  accessTtl: number;
  refreshTtl: number;
}

function getConfig(): JwtConfig {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');

  return {
    secret: new TextEncoder().encode(secret),
    issuer: process.env.JWT_ISSUER ?? 'aasop',
    audience: 'aasop-api',
    accessTtl: 900, // 15 minutes
    refreshTtl: 604800, // 7 days
  };
}

// ==================== Token Creation ====================

/** Create a JWT access token */
export async function createAccessToken(payload: Omit<TokenPayload, 'type' | 'jti' | 'iat' | 'exp'>): Promise<string> {
  const config = getConfig();
  const jti = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt(now)
    .setExpirationTime(now + config.accessTtl)
    .setJti(jti)
    .sign(config.secret);
}

/** Create a JWT refresh token */
export async function createRefreshToken(userId: string, orgId: string): Promise<string> {
  const config = getConfig();
  const jti = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ type: 'refresh', orgId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt(now)
    .setExpirationTime(now + config.refreshTtl)
    .setJti(jti)
    .sign(config.secret);
}

/** Create a service token for inter-service communication */
export async function createServiceToken(serviceId: string, permissions: string[]): Promise<string> {
  const config = getConfig();
  const jti = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ type: 'service', permissions })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(serviceId)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt(now)
    .setExpirationTime(now + config.accessTtl)
    .setJti(jti)
    .sign(config.secret);
}

/** Create a full token pair */
export async function createTokenPair(
  userId: string,
  email: string,
  orgId: string,
  role: string,
  permissions: string[],
): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    createAccessToken({ sub: userId, email, orgId, role, permissions }),
    createRefreshToken(userId, orgId),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: getConfig().accessTtl,
    tokenType: 'Bearer',
  };
}

// ==================== Token Verification ====================

/** Verify and decode a JWT token */
export async function verifyToken(token: string, expectedType?: 'access' | 'refresh' | 'service'): Promise<TokenPayload> {
  const config = getConfig();

  try {
    const { payload } = await jwtVerify(token, config.secret, {
      issuer: config.issuer,
      audience: config.audience,
      clockTolerance: 60,
    });

    const parsed = TokenPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Invalid token payload structure');
    }

    if (expectedType && parsed.data.type !== expectedType) {
      throw new Error(`Expected token type ${expectedType}, got ${parsed.data.type}`);
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
    throw new Error('Token verification failed');
  }
}

/** Extract token from Authorization header */
export function extractBearerToken(header: string): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

/** Check if a token is expired */
export function isTokenExpired(payload: TokenPayload): boolean {
  return payload.exp * 1000 < Date.now();
}

/** Get time until token expiry in seconds */
export function getTokenExpirySeconds(payload: TokenPayload): number {
  return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
}

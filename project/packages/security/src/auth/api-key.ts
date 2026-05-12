/**
 * API key generation and validation.
 */

import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';

/** API key prefix length for identification */
const KEY_PREFIX_LENGTH = 8;
/** API key total length */
const KEY_LENGTH = 48;

/** API key metadata schema */
export const ApiKeyMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(256),
  keyPrefix: z.string().length(KEY_PREFIX_LENGTH),
  permissions: z.array(z.string()).default([]),
  scopes: z.array(z.string()).default([]),
  rateLimit: z.number().positive().nullable().default(null),
  expiresAt: z.date().nullable().default(null),
  lastUsedAt: z.date().nullable().default(null),
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ApiKeyMetadata = z.infer<typeof ApiKeyMetadataSchema>;

/** Generated API key result */
export interface GeneratedApiKey {
  key: string;
  keyPrefix: string;
  keyHash: string;
}

// ==================== Key Generation ====================

/** Generate a new API key */
export function generateApiKey(): GeneratedApiKey {
  const key = `aasop_${randomBytes(KEY_LENGTH).toString('base64url')}`;
  const keyPrefix = key.slice(0, KEY_PREFIX_LENGTH);
  const keyHash = hashApiKey(key);

  return { key, keyPrefix, keyHash };
}

/** Hash an API key using SHA-256 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Extract prefix from an API key */
export function extractKeyPrefix(key: string): string {
  return key.slice(0, KEY_PREFIX_LENGTH);
}

// ==================== Key Validation ====================

/** Validate an API key format */
export function isValidKeyFormat(key: string): boolean {
  return key.startsWith('aasop_') && key.length >= 20;
}

/** Check if API key is expired */
export function isKeyExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() < Date.now();
}

/** Verify a provided key against a hash */
export function verifyApiKey(providedKey: string, storedHash: string): boolean {
  const hash = hashApiKey(providedKey);
  return hash === storedHash;
}

// ==================== Key Scopes ====================

/** Parse scope string into parts */
export function parseScope(scope: string): { resource: string; action: string } {
  const [resource, action] = scope.split(':');
  return { resource: resource ?? scope, action: action ?? '*' };
}

/** Check if a key has a specific scope */
export function hasScope(scopes: string[], requiredScope: string): boolean {
  const { resource, action } = parseScope(requiredScope);

  return scopes.some((scope) => {
    const { resource: sResource, action: sAction } = parseScope(scope);
    if (sResource === '*') return true;
    if (sResource !== resource) return false;
    if (sAction === '*') return true;
    return sAction === action;
  });
}

/** Check if a key has all required scopes */
export function hasAllScopes(scopes: string[], requiredScopes: string[]): boolean {
  return requiredScopes.every((scope) => hasScope(scopes, scope));
}

// ==================== Rate Limiting Helpers ====================

/** Redis key for rate limiting */
export function rateLimitKey(keyPrefix: string): string {
  return `apikey:ratelimit:${keyPrefix}`;
}

/** Redis key for usage tracking */
export function usageKey(keyPrefix: string, period: string): string {
  return `apikey:usage:${keyPrefix}:${period}`;
}

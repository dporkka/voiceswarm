// @ts-nocheck
/**
 * Multi-tenant resolution logic.
 * Determines which organization context a request operates in.
 */

import { z } from 'zod';

/** Tenant resolution strategy */
export enum TenantResolutionStrategy {
  HEADER = 'header',
  SUBDOMAIN = 'subdomain',
  PATH = 'path',
  JWT = 'jwt',
  API_KEY = 'api_key',
}

/** Tenant context */
export const TenantContextSchema = z.object({
  orgId: z.string().uuid(),
  orgSlug: z.string().optional(),
  resolvedBy: z.nativeEnum(TenantResolutionStrategy),
  isValid: z.boolean(),
  permissions: z.array(z.string()).default([]),
});

export type TenantContext = z.infer<typeof TenantContextSchema>;

/** Tenant resolver configuration */
export interface TenantResolverConfig {
  headerName: string;
  strategies: TenantResolutionStrategy[];
  allowCrossOrg: boolean;
  defaultOrgId?: string;
}

const DefaultResolverConfig: TenantResolverConfig = {
  headerName: 'x-organization-id',
  strategies: [TenantResolutionStrategy.JWT, TenantResolutionStrategy.HEADER, TenantResolutionStrategy.API_KEY],
  allowCrossOrg: false,
};

/** Tenant resolver */
export class TenantResolver {
  private config: TenantResolverConfig;
  private orgLookup: (orgId: string) => Promise<{ id: string; slug: string; status: string } | null>;

  constructor(
    orgLookup: (orgId: string) => Promise<{ id: string; slug: string; status: string } | null>,
    config?: Partial<TenantResolverConfig>,
  ) {
    this.config = { ...DefaultResolverConfig, ...config };
    this.orgLookup = orgLookup;
  }

  // ==================== Resolution ====================

  /** Resolve tenant from HTTP headers */
  async resolveFromHeaders(headers: Record<string, string>): Promise<TenantContext | null> {
    const orgId = headers[this.config.headerName.toLowerCase()];
    if (!orgId) return null;

    try {
      const org = await this.orgLookup(orgId);
      if (!org || org.status !== 'active') {
        return {
          orgId,
          resolvedBy: TenantResolutionStrategy.HEADER,
          isValid: false,
          permissions: [],
        };
      }

      return {
        orgId: org.id,
        orgSlug: org.slug,
        resolvedBy: TenantResolutionStrategy.HEADER,
        isValid: true,
        permissions: [],
      };
    } catch {
      return null;
    }
  }

  /** Resolve tenant from JWT payload */
  async resolveFromJwt(payload: { orgId: string }): Promise<TenantContext | null> {
    try {
      const org = await this.orgLookup(payload.orgId);
      if (!org || org.status !== 'active') {
        return {
          orgId: payload.orgId,
          resolvedBy: TenantResolutionStrategy.JWT,
          isValid: false,
          permissions: [],
        };
      }

      return {
        orgId: org.id,
        orgSlug: org.slug,
        resolvedBy: TenantResolutionStrategy.JWT,
        isValid: true,
        permissions: [],
      };
    } catch {
      return null;
    }
  }

  /** Resolve tenant from subdomain */
  async resolveFromSubdomain(subdomain: string): Promise<TenantContext | null> {
    // Subdomain is treated as the org slug
    try {
      // This would need a slug-based lookup
      return {
        orgId: '', // Would be resolved via slug lookup
        orgSlug: subdomain,
        resolvedBy: TenantResolutionStrategy.SUBDOMAIN,
        isValid: false,
        permissions: [],
      };
    } catch {
      return null;
    }
  }

  /** Resolve tenant using configured strategies */
  async resolve(request: {
    headers?: Record<string, string>;
    jwtPayload?: { orgId: string };
    subdomain?: string;
    apiKeyMetadata?: { orgId: string };
  }): Promise<TenantContext> {
    for (const strategy of this.config.strategies) {
      let result: TenantContext | null = null;

      switch (strategy) {
        case TenantResolutionStrategy.HEADER:
          if (request.headers) {
            result = await this.resolveFromHeaders(request.headers);
          }
          break;
        case TenantResolutionStrategy.JWT:
          if (request.jwtPayload) {
            result = await this.resolveFromJwt(request.jwtPayload);
          }
          break;
        case TenantResolutionStrategy.API_KEY:
          if (request.apiKeyMetadata) {
            result = await this.resolveFromJwt(request.apiKeyMetadata);
          }
          break;
        case TenantResolutionStrategy.SUBDOMAIN:
          if (request.subdomain) {
            result = await this.resolveFromSubdomain(request.subdomain);
          }
          break;
        default:
          break;
      }

      if (result?.isValid) return result;
    }

    // Return default/fallback context
    return {
      orgId: this.config.defaultOrgId ?? '',
      resolvedBy: TenantResolutionStrategy.JWT,
      isValid: !!this.config.defaultOrgId,
      permissions: [],
    };
  }

  /** Validate that a tenant context is valid */
  async validateTenant(ctx: TenantContext): Promise<boolean> {
    if (!ctx.isValid) return false;
    const org = await this.orgLookup(ctx.orgId);
    return org?.status === 'active' ?? false;
  }

  /** Check if cross-organization access is allowed */
  canAccessCrossOrg(ctx: TenantContext, targetOrgId: string): boolean {
    if (this.config.allowCrossOrg) return true;
    return ctx.orgId === targetOrgId;
  }
}

/** Tenant resolution middleware helper */
export async function resolveTenant(
  resolver: TenantResolver,
  request: {
    headers?: Record<string, string>;
    jwtPayload?: { orgId: string };
    subdomain?: string;
  },
): Promise<TenantContext> {
  const ctx = await resolver.resolve(request);
  if (!ctx.isValid) {
    const error = new Error('Invalid or inactive organization');
    (error as Record<string, unknown>).statusCode = 401;
    (error as Record<string, unknown>).code = 'INVALID_TENANT';
    throw error;
  }
  return ctx;
}

/** Create a tenant-aware database filter */
export function tenantFilter(orgId: string): { orgId: string } {
  return { orgId };
}

/** Scope a query to a specific tenant */
export function scopeToTenant<T extends Record<string, unknown>>(
  query: T,
  orgId: string,
  overrideField = 'orgId',
): T {
  return {
    ...query,
    [overrideField]: orgId,
  };
}

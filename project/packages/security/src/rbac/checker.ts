/**
 * Permission checking logic.
 * Provides efficient permission evaluation with caching.
 */

import { SystemRole, resolveRolePermissions } from './roles.js';
import { parsePermission, isWildcardPermission } from './permissions.js';

/** Permission check context */
export interface PermissionContext {
  userId: string;
  orgId: string;
  role: SystemRole;
  permissions: string[];
  projectRoles?: Record<string, string>;
}

/** Resource context for permission checks */
export interface ResourceContext {
  orgId?: string;
  projectId?: string;
  resourceOwnerId?: string;
  resourceType: string;
  resourceId: string;
}

/** Permission check result */
export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
  missingPermissions?: string[];
}

// ==================== Core Permission Check ====================

/** Check if permissions include a specific permission (with wildcard support) */
export function hasPermission(grantedPermissions: string[], requiredPermission: string): boolean {
  // Check wildcard
  if (grantedPermissions.includes('*')) return true;

  // Check exact match
  if (grantedPermissions.includes(requiredPermission)) return true;

  // Check wildcard resource match
  const { resource } = parsePermission(requiredPermission);
  if (grantedPermissions.includes(`${resource}:*`)) return true;

  return false;
}

/** Check if all required permissions are granted */
export function hasAllPermissions(grantedPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every((perm) => hasPermission(grantedPermissions, perm));
}

/** Check if any of the required permissions are granted */
export function hasAnyPermission(grantedPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some((perm) => hasPermission(grantedPermissions, perm));
}

// ==================== Context-based Checks ====================

/** Check permission with full context */
export function checkPermission(
  ctx: PermissionContext,
  requiredPermission: string,
  resourceCtx?: ResourceContext,
): PermissionCheckResult {
  const grantedPermissions = resolveEffectivePermissions(ctx);

  // Check organization scope
  if (resourceCtx?.orgId && resourceCtx.orgId !== ctx.orgId) {
    // Cross-org access - only super admin
    if (!hasPermission(grantedPermissions, '*')) {
      return { allowed: false, reason: 'Cross-organization access denied' };
    }
  }

  // Check resource ownership
  if (resourceCtx?.resourceOwnerId === ctx.userId) {
    // Resource owner always has access to their own resources
    return { allowed: true, reason: 'Resource owner' };
  }

  // Check project-level roles
  if (resourceCtx?.projectId && ctx.projectRoles?.[resourceCtx.projectId]) {
    const projectPerms = resolveRolePermissions(ctx.projectRoles[resourceCtx.projectId] as SystemRole);
    if (hasPermission(projectPerms, requiredPermission)) {
      return { allowed: true, reason: 'Project role grants permission' };
    }
  }

  // Standard permission check
  if (hasPermission(grantedPermissions, requiredPermission)) {
    return { allowed: true, reason: 'Permission granted' };
  }

  return {
    allowed: false,
    reason: `Missing permission: ${requiredPermission}`,
    missingPermissions: [requiredPermission],
  };
}

/** Check multiple permissions */
export function checkPermissions(
  ctx: PermissionContext,
  requiredPermissions: string[],
  resourceCtx?: ResourceContext,
): PermissionCheckResult {
  const grantedPermissions = resolveEffectivePermissions(ctx);

  // Check organization scope
  if (resourceCtx?.orgId && resourceCtx.orgId !== ctx.orgId) {
    if (!hasPermission(grantedPermissions, '*')) {
      return { allowed: false, reason: 'Cross-organization access denied' };
    }
  }

  // Check resource ownership
  if (resourceCtx?.resourceOwnerId === ctx.userId) {
    return { allowed: true, reason: 'Resource owner' };
  }

  const missingPermissions = requiredPermissions.filter((perm) => !hasPermission(grantedPermissions, perm));

  if (missingPermissions.length === 0) {
    return { allowed: true, reason: 'All permissions granted' };
  }

  return {
    allowed: false,
    reason: `Missing permissions: ${missingPermissions.join(', ')}`,
    missingPermissions,
  };
}

// ==================== Permission Resolution ====================

/** Resolve effective permissions for a user context */
export function resolveEffectivePermissions(ctx: PermissionContext): string[] {
  const rolePermissions = resolveRolePermissions(ctx.role);
  const explicitPermissions = ctx.permissions;

  // Combine role and explicit permissions
  const combined = new Set([...rolePermissions, ...explicitPermissions]);

  return [...combined];
}

/** Create a permission context from user data */
export function createPermissionContext(user: {
  id: string;
  orgId: string;
  role: SystemRole;
  permissions?: string[];
  projectRoles?: Record<string, string>;
}): PermissionContext {
  return {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
    permissions: user.permissions ?? [],
    projectRoles: user.projectRoles,
  };
}

// ==================== Middleware Helpers ====================

/** Build a permission middleware for a specific permission */
export function requirePermission(
  permission: string,
  getResourceContext?: (ctx: unknown) => ResourceContext,
) {
  return async (ctx: { permissionContext: PermissionContext }, next: () => Promise<void>): Promise<void> => {
    const resourceCtx = getResourceContext?.(ctx);
    const result = checkPermission(ctx.permissionContext, permission, resourceCtx);

    if (!result.allowed) {
      const error = new Error(result.reason);
      (error as Record<string, unknown>).statusCode = 403;
      (error as Record<string, unknown>).code = 'FORBIDDEN';
      throw error;
    }

    await next();
  };
}

/** Build middleware requiring any of the specified permissions */
export function requireAnyPermission(
  permissions: string[],
  getResourceContext?: (ctx: unknown) => ResourceContext,
) {
  return async (ctx: { permissionContext: PermissionContext }, next: () => Promise<void>): Promise<void> => {
    const resourceCtx = getResourceContext?.(ctx);
    const grantedPermissions = resolveEffectivePermissions(ctx.permissionContext);

    if (resourceCtx?.orgId && resourceCtx.orgId !== ctx.permissionContext.orgId) {
      if (!hasPermission(grantedPermissions, '*')) {
        const error = new Error('Cross-organization access denied');
        (error as Record<string, unknown>).statusCode = 403;
        throw error;
      }
    }

    if (!hasAnyPermission(grantedPermissions, permissions)) {
      const error = new Error(`Requires any of: ${permissions.join(', ')}`);
      (error as Record<string, unknown>).statusCode = 403;
      (error as Record<string, unknown>).code = 'FORBIDDEN';
      throw error;
    }

    await next();
  };
}

/**
 * Role definitions for AASOP RBAC.
 */

/** Built-in roles in the system */
export enum SystemRole {
  SUPER_ADMIN = 'super_admin',
  ORG_ADMIN = 'org_admin',
  ORG_MEMBER = 'org_member',
  VIEWER = 'viewer',
  SERVICE = 'service',
}

/** Role definition with metadata */
export interface RoleDefinition {
  name: string;
  description: string;
  level: number;
  isSystem: boolean;
  inheritsFrom: string[];
  permissions: string[];
  scope: 'global' | 'organization' | 'project';
}

/** Role definitions registry */
export const RoleDefinitions: Record<SystemRole, RoleDefinition> = {
  [SystemRole.SUPER_ADMIN]: {
    name: 'Super Admin',
    description: 'Full system access across all organizations',
    level: 100,
    isSystem: true,
    inheritsFrom: [],
    permissions: ['*'],
    scope: 'global',
  },

  [SystemRole.ORG_ADMIN]: {
    name: 'Organization Admin',
    description: 'Full access within an organization',
    level: 80,
    isSystem: true,
    inheritsFrom: [SystemRole.ORG_MEMBER],
    permissions: [
      'org:read',
      'org:write',
      'org:manage',
      'project:create',
      'project:delete',
      'project:manage',
      'agent:manage',
      'task:manage',
      'workflow:manage',
      'user:manage',
      'settings:manage',
      'billing:manage',
    ],
    scope: 'organization',
  },

  [SystemRole.ORG_MEMBER]: {
    name: 'Organization Member',
    description: 'Standard member with project access',
    level: 60,
    isSystem: true,
    inheritsFrom: [SystemRole.VIEWER],
    permissions: [
      'org:read',
      'project:read',
      'project:write',
      'agent:create',
      'agent:write',
      'task:create',
      'task:write',
      'task:execute',
      'workflow:create',
      'workflow:execute',
      'memory:read',
      'memory:write',
    ],
    scope: 'organization',
  },

  [SystemRole.VIEWER]: {
    name: 'Viewer',
    description: 'Read-only access to resources',
    level: 40,
    isSystem: true,
    inheritsFrom: [],
    permissions: [
      'org:read',
      'project:read',
      'agent:read',
      'task:read',
      'workflow:read',
      'memory:read',
    ],
    scope: 'organization',
  },

  [SystemRole.SERVICE]: {
    name: 'Service',
    description: 'Service account for automated processes',
    level: 20,
    isSystem: true,
    inheritsFrom: [],
    permissions: [
      'task:read',
      'task:write',
      'task:execute',
      'agent:read',
      'agent:write',
      'memory:read',
      'memory:write',
      'inference:call',
      'sandbox:create',
      'sandbox:write',
    ],
    scope: 'global',
  },
};

/** Get a role definition */
export function getRole(role: SystemRole): RoleDefinition {
  return RoleDefinitions[role];
}

/** Get all role definitions */
export function getAllRoles(): RoleDefinition[] {
  return Object.values(RoleDefinitions);
}

/** Get all system roles */
export function getSystemRoles(): RoleDefinition[] {
  return Object.values(RoleDefinitions).filter((r) => r.isSystem);
}

/** Resolve all permissions for a role including inherited ones */
export function resolveRolePermissions(role: SystemRole): string[] {
  const def = RoleDefinitions[role];
  if (!def) return [];

  const permissions = new Set(def.permissions);

  for (const inheritedRole of def.inheritsFrom) {
    const inherited = resolveRolePermissions(inheritedRole as SystemRole);
    for (const perm of inherited) {
      permissions.add(perm);
    }
  }

  return [...permissions];
}

/** Compare two roles by level */
export function compareRoles(a: SystemRole, b: SystemRole): number {
  const defA = RoleDefinitions[a];
  const defB = RoleDefinitions[b];
  return (defA?.level ?? 0) - (defB?.level ?? 0);
}

/** Check if role A outranks role B */
export function outranks(a: SystemRole, b: SystemRole): boolean {
  return compareRoles(a, b) > 0;
}

/** Validate a custom role name */
export function isValidRoleName(name: string): boolean {
  return /^[a-z][a-z0-9_]{0,63}$/.test(name) && !(name in RoleDefinitions);
}

/** Get roles that can be assigned by a given role */
export function getAssignableRoles(role: SystemRole): SystemRole[] {
  const level = RoleDefinitions[role]?.level ?? 0;
  return Object.entries(RoleDefinitions)
    .filter(([, def]) => def.level < level)
    .map(([name]) => name as SystemRole);
}

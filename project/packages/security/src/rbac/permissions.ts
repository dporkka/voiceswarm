/**
 * Permission constants and helpers for AASOP RBAC.
 */

// ==================== Permission Constants ====================

export const Permissions = {
  // Organization
  ORG_READ: 'org:read',
  ORG_WRITE: 'org:write',
  ORG_MANAGE: 'org:manage',

  // Project
  PROJECT_CREATE: 'project:create',
  PROJECT_READ: 'project:read',
  PROJECT_WRITE: 'project:write',
  PROJECT_DELETE: 'project:delete',
  PROJECT_MANAGE: 'project:manage',

  // Agent
  AGENT_CREATE: 'agent:create',
  AGENT_READ: 'agent:read',
  AGENT_WRITE: 'agent:write',
  AGENT_DELETE: 'agent:delete',
  AGENT_MANAGE: 'agent:manage',

  // Task
  TASK_CREATE: 'task:create',
  TASK_READ: 'task:read',
  TASK_WRITE: 'task:write',
  TASK_EXECUTE: 'task:execute',
  TASK_DELETE: 'task:delete',
  TASK_MANAGE: 'task:manage',

  // Workflow
  WORKFLOW_CREATE: 'workflow:create',
  WORKFLOW_READ: 'workflow:read',
  WORKFLOW_WRITE: 'workflow:write',
  WORKFLOW_EXECUTE: 'workflow:execute',
  WORKFLOW_DELETE: 'workflow:delete',
  WORKFLOW_MANAGE: 'workflow:manage',

  // Memory
  MEMORY_READ: 'memory:read',
  MEMORY_WRITE: 'memory:write',
  MEMORY_DELETE: 'memory:delete',

  // Sandbox
  SANDBOX_CREATE: 'sandbox:create',
  SANDBOX_READ: 'sandbox:read',
  SANDBOX_WRITE: 'sandbox:write',
  SANDBOX_DELETE: 'sandbox:delete',

  // User
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_MANAGE: 'user:manage',

  // Inference
  INFERENCE_CALL: 'inference:call',

  // Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  SETTINGS_MANAGE: 'settings:manage',

  // Billing
  BILLING_READ: 'billing:read',
  BILLING_MANAGE: 'billing:manage',

  // Audit
  AUDIT_READ: 'audit:read',
} as const;

/** All permission values as an array */
export const ALL_PERMISSIONS: string[] = Object.values(Permissions);

/** Permission categories */
export const PermissionCategories = {
  organization: [Permissions.ORG_READ, Permissions.ORG_WRITE, Permissions.ORG_MANAGE],
  project: [
    Permissions.PROJECT_CREATE,
    Permissions.PROJECT_READ,
    Permissions.PROJECT_WRITE,
    Permissions.PROJECT_DELETE,
    Permissions.PROJECT_MANAGE,
  ],
  agent: [
    Permissions.AGENT_CREATE,
    Permissions.AGENT_READ,
    Permissions.AGENT_WRITE,
    Permissions.AGENT_DELETE,
    Permissions.AGENT_MANAGE,
  ],
  task: [
    Permissions.TASK_CREATE,
    Permissions.TASK_READ,
    Permissions.TASK_WRITE,
    Permissions.TASK_EXECUTE,
    Permissions.TASK_DELETE,
    Permissions.TASK_MANAGE,
  ],
  workflow: [
    Permissions.WORKFLOW_CREATE,
    Permissions.WORKFLOW_READ,
    Permissions.WORKFLOW_WRITE,
    Permissions.WORKFLOW_EXECUTE,
    Permissions.WORKFLOW_DELETE,
    Permissions.WORKFLOW_MANAGE,
  ],
  memory: [Permissions.MEMORY_READ, Permissions.MEMORY_WRITE, Permissions.MEMORY_DELETE],
  sandbox: [
    Permissions.SANDBOX_CREATE,
    Permissions.SANDBOX_READ,
    Permissions.SANDBOX_WRITE,
    Permissions.SANDBOX_DELETE,
  ],
  user: [
    Permissions.USER_CREATE,
    Permissions.USER_READ,
    Permissions.USER_WRITE,
    Permissions.USER_MANAGE,
  ],
  inference: [Permissions.INFERENCE_CALL],
  settings: [Permissions.SETTINGS_READ, Permissions.SETTINGS_WRITE, Permissions.SETTINGS_MANAGE],
  billing: [Permissions.BILLING_READ, Permissions.BILLING_MANAGE],
  audit: [Permissions.AUDIT_READ],
} as const;

// ==================== Permission Helpers ====================

/** Parse a permission string into resource and action */
export function parsePermission(permission: string): { resource: string; action: string } {
  const parts = permission.split(':');
  return {
    resource: parts[0] ?? permission,
    action: parts[1] ?? '*',
  };
}

/** Get all permissions for a resource */
export function getResourcePermissions(resource: string): string[] {
  return ALL_PERMISSIONS.filter((p) => p.startsWith(`${resource}:`));
}

/** Check if permission is a wildcard */
export function isWildcardPermission(permission: string): boolean {
  return permission === '*'; // || permission.endsWith(':*');
}

/** Get the resource name from a permission */
export function getPermissionResource(permission: string): string {
  return parsePermission(permission).resource;
}

/** Validate a permission string */
export function isValidPermission(permission: string): boolean {
  if (isWildcardPermission(permission)) return true;
  return ALL_PERMISSIONS.includes(permission);
}

/** Group permissions by resource */
export function groupPermissionsByResource(permissions: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const perm of permissions) {
    const { resource } = parsePermission(perm);
    if (!grouped[resource]) grouped[resource] = [];
    grouped[resource].push(perm);
  }
  return grouped;
}

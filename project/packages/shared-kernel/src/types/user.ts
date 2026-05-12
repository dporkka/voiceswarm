/**
 * User and authentication types.
 */

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ORG_ADMIN = 'org_admin',
  ORG_MEMBER = 'org_member',
  VIEWER = 'viewer',
  SERVICE = 'service',
}

/** Core User model */
export interface User {
  id: string;
  email: string;
  name: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  role: UserRole;
  orgIds: string[];
  preferences: UserPreferences;
  lastLoginAt: Date | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** User preferences */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationPreferences;
  defaultOrgId: string | null;
  timezone: string;
  language: string;
}

/** Notification preferences */
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  taskUpdates: boolean;
  workflowUpdates: boolean;
  securityAlerts: boolean;
  digest: 'none' | 'daily' | 'weekly';
}

/** Authentication tokens */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

/** API key metadata */
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  scopes: string[];
  rateLimit: number | null;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  userId: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Identity provider configuration */
export interface IdentityProvider {
  id: string;
  name: string;
  type: 'oauth2' | 'saml' | 'oidc' | 'ldap';
  config: Record<string, unknown>;
  orgId: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Session information */
export interface Session {
  id: string;
  userId: string;
  orgId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  createdAt: Date;
}

/** Input for creating a user */
export interface CreateUserInput {
  email: string;
  name: string;
  displayName?: string;
  avatarUrl?: string;
  role?: UserRole;
  orgId?: string;
}

/** Input for updating a user */
export interface UpdateUserInput {
  name?: string;
  displayName?: string;
  avatarUrl?: string;
  status?: UserStatus;
  preferences?: Partial<UserPreferences>;
}

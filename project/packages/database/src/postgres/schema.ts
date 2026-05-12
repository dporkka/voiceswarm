/**
 * Kysely-compatible database schema types.
 * Mirrors the Prisma schema for type-safe SQL queries.
 */

import type { AgentState, AgentRole, AgentCapability } from '@aasop/shared-kernel';
import type { TaskStatus, TaskPriority, TaskType } from '@aasop/shared-kernel';
import type { WorkflowStatus, WorkflowTrigger } from '@aasop/shared-kernel';
import type { ProjectStatus, ProjectVisibility } from '@aasop/shared-kernel';
import type { MemoryType } from '@aasop/shared-kernel';
import type { SandboxStatus, SandboxRuntime } from '@aasop/shared-kernel';
import type { UserStatus, UserRole } from '@aasop/shared-kernel';

// ==================== Users & Organizations ====================

export interface UserTable {
  id: string;
  email: string;
  name: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  role: UserRole;
  preferences: unknown;
  lastLoginAt: Date | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationTable {
  id: string;
  name: string;
  slug: string;
  description: string;
  ownerId: string;
  settings: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgMembershipTable {
  id: string;
  orgId: string;
  userId: string;
  role: string;
  permissions: string[];
  joinedAt: Date;
}

// ==================== Projects ====================

export interface ProjectTable {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  stack: unknown;
  repo: unknown;
  orgId: string;
  ownerId: string;
  tags: string[];
  settings: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemberTable {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  joinedAt: Date;
}

// ==================== Agents ====================

export interface AgentTable {
  id: string;
  name: string;
  description: string;
  role: AgentRole;
  capabilities: AgentCapability[];
  state: AgentState;
  config: unknown;
  metrics: unknown;
  projectId: string;
  orgId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Tasks ====================

export interface TaskTable {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  projectId: string;
  workflowId: string | null;
  parentTaskId: string | null;
  dependencies: unknown;
  context: unknown;
  maxAttempts: number;
  timeoutMs: number;
  startedAt: Date | null;
  completedAt: Date | null;
  dueDate: Date | null;
  tags: string[];
  orgId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Workflows ====================

export interface WorkflowDefinitionTable {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: unknown;
  trigger: WorkflowTrigger;
  triggerConfig: unknown;
  inputSchema: unknown;
  outputSchema: unknown;
  tags: string[];
  orgId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowInstanceTable {
  id: string;
  definitionId: string;
  definitionVersion: string;
  status: WorkflowStatus;
  input: unknown;
  output: unknown;
  context: unknown;
  stepResults: unknown;
  currentStepId: string | null;
  startedAt: Date;
  completedAt: Date | null;
  projectId: string;
  orgId: string;
  triggeredBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Memory ====================

export interface MemoryEntryTable {
  id: string;
  content: string;
  type: MemoryType;
  embedding: number[] | null;
  metadata: unknown;
  source: unknown;
  access: string;
  tags: string[];
  relatedMemoryIds: string[];
  confidence: number;
  decayFactor: number;
  agentId: string;
  projectId: string;
  orgId: string;
  lastAccessedAt: Date;
  accessCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Sandbox ====================

export interface SandboxTable {
  id: string;
  name: string;
  status: SandboxStatus;
  runtime: SandboxRuntime;
  config: unknown;
  agentId: string | null;
  taskId: string | null;
  projectId: string;
  orgId: string;
  podName: string | null;
  ipAddress: string | null;
  ports: unknown;
  startedAt: Date | null;
  terminatedAt: Date | null;
  lastHealthCheck: Date | null;
  healthStatus: string;
  exitCode: number | null;
  logs: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SandboxTemplateTable {
  id: string;
  name: string;
  description: string;
  runtime: SandboxRuntime;
  prebuiltImage: string;
  defaultConfig: unknown;
  packages: string[];
  initScript: string | null;
  orgId: string | null;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Audit ====================

export interface AuditLogTable {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string | null;
  orgId: string;
  projectId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

// ==================== API Keys ====================

export interface ApiKeyTable {
  id: string;
  name: string;
  keyHash: string;
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

// ==================== Combined Database Schema ====================

export interface Database {
  users: UserTable;
  organizations: OrganizationTable;
  orgMemberships: OrgMembershipTable;
  projects: ProjectTable;
  projectMembers: ProjectMemberTable;
  agents: AgentTable;
  tasks: TaskTable;
  workflowDefinitions: WorkflowDefinitionTable;
  workflowInstances: WorkflowInstanceTable;
  memoryEntries: MemoryEntryTable;
  sandboxes: SandboxTable;
  sandboxTemplates: SandboxTemplateTable;
  auditLogs: AuditLogTable;
  apiKeys: ApiKeyTable;
}

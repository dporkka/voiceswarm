export type {
  Agent,
  AgentConfig,
  Task,
  TaskStatus,
  WorkflowStatus,
  RouteRequest,
  RouteResult,
  SandboxConfig,
  MemoryEntry,
  Project,
  Organization,
  User,
} from '@aasop/shared-kernel';

export { AgentState as AgentStatus } from '@aasop/shared-kernel';

import type { Sandbox, WorkflowInstance } from '@aasop/shared-kernel';

export type Workflow = WorkflowInstance;
export type SandboxInfo = Sandbox;

export interface ContextWindow {
  entries: Array<{
    id: string;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
  summary?: string;
  tokenCount: number;
}

export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  orgId: string;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  page?: number;
  limit?: number;
  total?: number;
  nextCursor?: string | null;
  hasMore: boolean;
}

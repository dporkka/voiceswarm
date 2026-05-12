/**
 * Task types and status definitions.
 * Tasks are units of work assigned to agents.
 */

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  REVIEWING = 'reviewing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TaskType {
  IMPLEMENTATION = 'implementation',
  BUG_FIX = 'bug_fix',
  REFACTORING = 'refactoring',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  RESEARCH = 'research',
  CODE_REVIEW = 'code_review',
  DEPLOYMENT = 'deployment',
  ANALYSIS = 'analysis',
  CUSTOM = 'custom',
}

/** Definition of a task dependency */
export interface TaskDependency {
  taskId: string;
  dependencyType: 'blocks' | 'blocked_by';
}

/** Artifact produced by a task */
export interface TaskArtifact {
  id: string;
  name: string;
  type: string;
  uri: string;
  sizeBytes: number;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

/** A single execution attempt for a task */
export interface TaskAttempt {
  attemptNumber: number;
  startedAt: Date;
  completedAt: Date | null;
  status: TaskStatus;
  result: string | null;
  error: string | null;
  logs: string[];
  tokensUsed: number;
}

/** Core Task domain model */
export interface Task {
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
  dependencies: TaskDependency[];
  subtaskIds: string[];
  artifacts: TaskArtifact[];
  attempts: TaskAttempt[];
  context: Record<string, unknown>;
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

/** Input for creating a new task */
export interface CreateTaskInput {
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  projectId: string;
  assigneeId?: string;
  workflowId?: string;
  parentTaskId?: string;
  dependencies?: TaskDependency[];
  context?: Record<string, unknown>;
  maxAttempts?: number;
  timeoutMs?: number;
  dueDate?: Date;
  tags?: string[];
}

/** Input for updating a task */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  context?: Record<string, unknown>;
  maxAttempts?: number;
  timeoutMs?: number;
  dueDate?: Date | null;
  tags?: string[];
}

/** Summary of a task for listing */
export interface TaskSummary {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  projectId: string;
  progressPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

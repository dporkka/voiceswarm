/**
 * Workflow types and status definitions.
 * Workflows orchestrate multi-step processes across tasks and agents.
 */

export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMED_OUT = 'timed_out',
}

export enum WorkflowTrigger {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  EVENT = 'event',
  WEBHOOK = 'webhook',
  API = 'api',
}

/** A step within a workflow definition */
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  taskType: string;
  agentRole: string | null;
  config: Record<string, unknown>;
  dependsOn: string[];
  condition: string | null;
  retryPolicy: RetryPolicy;
  timeoutMs: number;
}

/** Retry policy for workflow steps */
export interface RetryPolicy {
  maxRetries: number;
  backoffType: 'fixed' | 'linear' | 'exponential';
  initialDelayMs: number;
  maxDelayMs: number;
}

/** Workflow definition (blueprint) */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
  trigger: WorkflowTrigger;
  triggerConfig: Record<string, unknown>;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  tags: string[];
  orgId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Runtime instance of a workflow */
export interface WorkflowInstance {
  id: string;
  definitionId: string;
  definitionVersion: string;
  status: WorkflowStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  context: Record<string, unknown>;
  stepResults: WorkflowStepResult[];
  currentStepId: string | null;
  startedAt: Date;
  completedAt: Date | null;
  projectId: string;
  orgId: string;
  triggeredBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Result of an executed workflow step */
export interface WorkflowStepResult {
  stepId: string;
  taskId: string | null;
  status: WorkflowStatus;
  output: Record<string, unknown> | null;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
  attempts: number;
}

/** Input to create a workflow definition */
export interface CreateWorkflowDefinitionInput {
  name: string;
  description: string;
  steps: Omit<WorkflowStep, 'id'>[];
  trigger: WorkflowTrigger;
  triggerConfig?: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  tags?: string[];
}

/** Input to trigger a workflow instance */
export interface TriggerWorkflowInput {
  definitionId: string;
  projectId: string;
  input: Record<string, unknown>;
}

/** Workflow event emitted on state changes */
export interface WorkflowStateChangedEvent {
  instanceId: string;
  previousStatus: WorkflowStatus;
  newStatus: WorkflowStatus;
  currentStepId: string | null;
  timestamp: Date;
}

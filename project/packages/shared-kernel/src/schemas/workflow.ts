import { z } from 'zod';
import { WorkflowStatus, WorkflowTrigger } from '../types/workflow.js';

/** Zod schema for WorkflowStatus enum */
export const WorkflowStatusSchema = z.nativeEnum(WorkflowStatus);

/** Zod schema for WorkflowTrigger enum */
export const WorkflowTriggerSchema = z.nativeEnum(WorkflowTrigger);

/** Zod schema for RetryPolicy */
export const RetryPolicySchema = z.object({
  maxRetries: z.number().int().nonnegative().default(3),
  backoffType: z.enum(['fixed', 'linear', 'exponential']).default('exponential'),
  initialDelayMs: z.number().int().positive().default(1000),
  maxDelayMs: z.number().int().positive().default(300000),
});

/** Zod schema for WorkflowStep */
export const WorkflowStepSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(256),
  description: z.string().max(4096),
  taskType: z.string(),
  agentRole: z.string().nullable(),
  config: z.record(z.unknown()).default({}),
  dependsOn: z.array(z.string().uuid()).default([]),
  condition: z.string().nullable(),
  retryPolicy: RetryPolicySchema,
  timeoutMs: z.number().int().positive().default(300000),
});

/** Zod schema for WorkflowStepResult */
export const WorkflowStepResultSchema = z.object({
  stepId: z.string().uuid(),
  taskId: z.string().uuid().nullable(),
  status: WorkflowStatusSchema,
  output: z.record(z.unknown()).nullable(),
  error: z.string().nullable(),
  startedAt: z.date(),
  completedAt: z.date().nullable(),
  attempts: z.number().int().nonnegative().default(1),
});

/** Zod schema for CreateWorkflowDefinitionInput */
export const CreateWorkflowDefinitionInputSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().max(4096),
  steps: z.array(
    WorkflowStepSchema.omit({ id: true }).extend({
      id: z.string().uuid().optional(),
    }),
  ).min(1),
  trigger: WorkflowTriggerSchema.default(WorkflowTrigger.MANUAL),
  triggerConfig: z.record(z.unknown()).default({}),
  inputSchema: z.record(z.unknown()).default({}),
  outputSchema: z.record(z.unknown()).default({}),
  tags: z.array(z.string()).default([]),
});

/** Zod schema for TriggerWorkflowInput */
export const TriggerWorkflowInputSchema = z.object({
  definitionId: z.string().uuid(),
  projectId: z.string().uuid(),
  input: z.record(z.unknown()).default({}),
});

/** Zod schema for WorkflowDefinition */
export const WorkflowDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  steps: z.array(WorkflowStepSchema),
  trigger: WorkflowTriggerSchema,
  triggerConfig: z.record(z.unknown()),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  tags: z.array(z.string()),
  orgId: z.string().uuid(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/** Zod schema for WorkflowInstance */
export const WorkflowInstanceSchema = z.object({
  id: z.string().uuid(),
  definitionId: z.string().uuid(),
  definitionVersion: z.string(),
  status: WorkflowStatusSchema,
  input: z.record(z.unknown()),
  output: z.record(z.unknown()).nullable(),
  context: z.record(z.unknown()),
  stepResults: z.array(WorkflowStepResultSchema),
  currentStepId: z.string().uuid().nullable(),
  startedAt: z.date(),
  completedAt: z.date().nullable(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  triggeredBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/** Zod schema for WorkflowStateChangedEvent */
export const WorkflowStateChangedEventSchema = z.object({
  instanceId: z.string().uuid(),
  previousStatus: WorkflowStatusSchema,
  newStatus: WorkflowStatusSchema,
  currentStepId: z.string().uuid().nullable(),
  timestamp: z.date(),
});

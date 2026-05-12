import { z } from 'zod';
import { TaskStatus, TaskPriority, TaskType } from '../types/task.js';

/** Zod schema for TaskStatus enum */
export const TaskStatusSchema = z.nativeEnum(TaskStatus);

/** Zod schema for TaskPriority enum */
export const TaskPrioritySchema = z.nativeEnum(TaskPriority);

/** Zod schema for TaskType enum */
export const TaskTypeSchema = z.nativeEnum(TaskType);

/** Zod schema for TaskDependency */
export const TaskDependencySchema = z.object({
  taskId: z.string().uuid(),
  dependencyType: z.enum(['blocks', 'blocked_by']),
});

/** Zod schema for TaskArtifact */
export const TaskArtifactSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string(),
  uri: z.string().url(),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.date(),
  metadata: z.record(z.unknown()).default({}),
});

/** Zod schema for TaskAttempt */
export const TaskAttemptSchema = z.object({
  attemptNumber: z.number().int().positive(),
  startedAt: z.date(),
  completedAt: z.date().nullable(),
  status: TaskStatusSchema,
  result: z.string().nullable(),
  error: z.string().nullable(),
  logs: z.array(z.string()).default([]),
  tokensUsed: z.number().int().nonnegative().default(0),
});

/** Zod schema for CreateTaskInput */
export const CreateTaskInputSchema = z.object({
  title: z.string().min(1).max(512),
  description: z.string().max(10000),
  type: TaskTypeSchema,
  priority: TaskPrioritySchema.default(TaskPriority.MEDIUM),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  workflowId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  dependencies: z.array(TaskDependencySchema).default([]),
  context: z.record(z.unknown()).default({}),
  maxAttempts: z.number().int().positive().default(3),
  timeoutMs: z.number().int().positive().default(300000),
  dueDate: z.date().optional(),
  tags: z.array(z.string()).default([]),
});

/** Zod schema for UpdateTaskInput */
export const UpdateTaskInputSchema = z.object({
  title: z.string().min(1).max(512).optional(),
  description: z.string().max(10000).optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  context: z.record(z.unknown()).optional(),
  maxAttempts: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().optional(),
  dueDate: z.date().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

/** Zod schema for Task domain model */
export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  type: TaskTypeSchema,
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  assigneeId: z.string().uuid().nullable(),
  projectId: z.string().uuid(),
  workflowId: z.string().uuid().nullable(),
  parentTaskId: z.string().uuid().nullable(),
  dependencies: z.array(TaskDependencySchema),
  subtaskIds: z.array(z.string().uuid()),
  artifacts: z.array(TaskArtifactSchema),
  attempts: z.array(TaskAttemptSchema),
  context: z.record(z.unknown()),
  maxAttempts: z.number().int().positive(),
  timeoutMs: z.number().int().positive(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  dueDate: z.date().nullable(),
  tags: z.array(z.string()),
  orgId: z.string().uuid(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/** Zod schema for TaskSummary */
export const TaskSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: TaskTypeSchema,
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  assigneeId: z.string().uuid().nullable(),
  projectId: z.string().uuid(),
  progressPercent: z.number().int().min(0).max(100),
  createdAt: z.date(),
  updatedAt: z.date(),
});

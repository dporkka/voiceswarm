import { z } from 'zod';
import { AgentState, AgentRole, AgentCapability } from '../types/agent.js';

/** Zod schema for AgentState enum */
export const AgentStateSchema = z.nativeEnum(AgentState);

/** Zod schema for AgentRole enum */
export const AgentRoleSchema = z.nativeEnum(AgentRole);

/** Zod schema for AgentCapability enum */
export const AgentCapabilitySchema = z.nativeEnum(AgentCapability);

/** Zod schema for AgentConfig */
export const AgentConfigSchema = z.object({
  modelId: z.string().min(1).max(256),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(4096),
  timeoutMs: z.number().int().positive().default(300000),
  sandboxTemplateId: z.string().min(1),
  allowedTools: z.array(z.string()).default([]),
  environmentVariables: z.record(z.string()).default({}),
});

/** Zod schema for AgentMetrics */
export const AgentMetricsSchema = z.object({
  tasksCompleted: z.number().int().nonnegative().default(0),
  tasksFailed: z.number().int().nonnegative().default(0),
  totalExecutionTimeMs: z.number().int().nonnegative().default(0),
  tokensUsed: z.number().int().nonnegative().default(0),
  lastActiveAt: z.date().nullable().default(null),
  avgTaskDurationMs: z.number().int().nonnegative().default(0),
});

/** Zod schema for CreateAgentInput */
export const CreateAgentInputSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().max(4096),
  role: AgentRoleSchema,
  capabilities: z.array(AgentCapabilitySchema).min(1),
  config: AgentConfigSchema,
  projectId: z.string().uuid(),
});

/** Zod schema for UpdateAgentInput */
export const UpdateAgentInputSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(4096).optional(),
  role: AgentRoleSchema.optional(),
  capabilities: z.array(AgentCapabilitySchema).optional(),
  config: AgentConfigSchema.partial().optional(),
  state: AgentStateSchema.optional(),
});

/** Zod schema for Agent domain model */
export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  role: AgentRoleSchema,
  capabilities: z.array(AgentCapabilitySchema),
  state: AgentStateSchema,
  config: AgentConfigSchema,
  metrics: AgentMetricsSchema,
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/** Zod schema for AgentStateChangedEvent */
export const AgentStateChangedEventSchema = z.object({
  agentId: z.string().uuid(),
  previousState: AgentStateSchema,
  newState: AgentStateSchema,
  reason: z.string(),
  timestamp: z.date(),
});

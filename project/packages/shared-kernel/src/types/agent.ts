/**
 * Agent types and state machine definitions.
 * Agents are autonomous entities that execute tasks within sandboxes.
 */

export enum AgentState {
  CREATED = 'created',
  CONFIGURED = 'configured',
  IDLE = 'idle',
  ASSIGNED = 'assigned',
  EXECUTING = 'executing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

/** Valid state transitions for the agent state machine */
export const AgentStateTransitions: Record<AgentState, AgentState[]> = {
  [AgentState.CREATED]: [AgentState.CONFIGURED, AgentState.ARCHIVED],
  [AgentState.CONFIGURED]: [AgentState.IDLE, AgentState.FAILED, AgentState.ARCHIVED],
  [AgentState.IDLE]: [AgentState.ASSIGNED, AgentState.PAUSED, AgentState.ARCHIVED],
  [AgentState.ASSIGNED]: [AgentState.EXECUTING, AgentState.IDLE, AgentState.FAILED],
  [AgentState.EXECUTING]: [AgentState.PAUSED, AgentState.COMPLETED, AgentState.FAILED],
  [AgentState.PAUSED]: [AgentState.EXECUTING, AgentState.IDLE, AgentState.ARCHIVED],
  [AgentState.COMPLETED]: [AgentState.IDLE, AgentState.ARCHIVED],
  [AgentState.FAILED]: [AgentState.IDLE, AgentState.CONFIGURED, AgentState.ARCHIVED],
  [AgentState.ARCHIVED]: [AgentState.CREATED],
};

/** Check if a state transition is valid */
export function canTransition(from: AgentState, to: AgentState): boolean {
  return AgentStateTransitions[from]?.includes(to) ?? false;
}

export enum AgentCapability {
  CODE_GENERATION = 'code_generation',
  CODE_REVIEW = 'code_review',
  TESTING = 'testing',
  DEBUGGING = 'debugging',
  DOCUMENTATION = 'documentation',
  REFACTORING = 'refactoring',
  ARCHITECTURE = 'architecture',
  DEVOPS = 'devops',
  PLANNING = 'planning',
  RESEARCH = 'research',
}

export enum AgentRole {
  DEVELOPER = 'developer',
  REVIEWER = 'reviewer',
  TESTER = 'tester',
  ARCHITECT = 'architect',
  DEVOPS = 'devops',
  RESEARCHER = 'researcher',
  LEAD = 'lead',
  SPECIALIST = 'specialist',
}

/** Runtime metrics for an agent */
export interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  totalExecutionTimeMs: number;
  tokensUsed: number;
  lastActiveAt: Date | null;
  avgTaskDurationMs: number;
}

/** Configuration for an agent's execution environment */
export interface AgentConfig {
  modelId: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  sandboxTemplateId: string;
  allowedTools: string[];
  environmentVariables: Record<string, string>;
}

/** Core Agent domain model */
export interface Agent {
  id: string;
  name: string;
  description: string;
  role: AgentRole;
  capabilities: AgentCapability[];
  state: AgentState;
  config: AgentConfig;
  metrics: AgentMetrics;
  projectId: string;
  orgId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Agent creation input (without system-generated fields) */
export interface CreateAgentInput {
  name: string;
  description: string;
  role: AgentRole;
  capabilities: AgentCapability[];
  config: AgentConfig;
  projectId: string;
}

/** Agent update input */
export interface UpdateAgentInput {
  name?: string;
  description?: string;
  role?: AgentRole;
  capabilities?: AgentCapability[];
  config?: Partial<AgentConfig>;
  state?: AgentState;
}

/** Agent event emitted when agent state changes */
export interface AgentStateChangedEvent {
  agentId: string;
  previousState: AgentState;
  newState: AgentState;
  reason: string;
  timestamp: Date;
}

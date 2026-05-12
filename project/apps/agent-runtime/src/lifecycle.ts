import { createLogger } from '@aasop/observability';

const logger = createLogger('agent-lifecycle');

export type AgentStatus = 'creating' | 'running' | 'executing' | 'paused' | 'error' | 'terminated' | 'idle';

export interface AgentState {
  id: string;
  status: AgentStatus;
  config: {
    skills: string[];
    memoryEnabled: boolean;
    maxIterations: number;
  };
  createdAt: Date;
  startedAt?: Date;
  lastActivityAt?: Date;
  completedTasks: number;
  failedTasks: number;
  currentTaskId?: string;
  errors: Array<{ timestamp: Date; message: string }>;
  memorySnapshot?: Record<string, unknown>;
}

type ValidTransition = {
  [K in AgentStatus]?: AgentStatus[];
};

const VALID_TRANSITIONS: ValidTransition = {
  creating: ['running', 'error', 'terminated'],
  running: ['executing', 'paused', 'error', 'terminated', 'idle'],
  executing: ['running', 'paused', 'error', 'terminated'],
  paused: ['running', 'terminated'],
  error: ['running', 'paused', 'terminated'],
  idle: ['running', 'executing', 'terminated'],
  terminated: [],
};

export class AgentLifecycle {
  private states = new Map<string, AgentState>();

  create(id: string, config: AgentState['config']): AgentState {
    const state: AgentState = {
      id,
      status: 'creating',
      config,
      createdAt: new Date(),
      completedTasks: 0,
      failedTasks: 0,
      errors: [],
    };
    this.states.set(id, state);
    logger.debug({ agentId: id }, 'Agent state created');
    return state;
  }

  transition(id: string, to: AgentStatus): AgentState {
    const state = this.states.get(id);
    if (!state) {
      throw new Error(`Agent ${id} not found`);
    }

    const from = state.status;
    const valid = VALID_TRANSITIONS[from];

    if (!valid?.includes(to) && from !== 'creating') {
      logger.warn({ agentId: id, from, to }, 'Invalid state transition');
      throw new Error(`Invalid transition from ${from} to ${to}`);
    }

    state.status = to;
    state.lastActivityAt = new Date();

    if (to === 'running' && !state.startedAt) {
      state.startedAt = new Date();
    }

    logger.debug({ agentId: id, from, to }, 'Agent state transitioned');
    return state;
  }

  getState(id: string): AgentState | undefined {
    return this.states.get(id);
  }

  canTransition(id: string, to: AgentStatus): boolean {
    const state = this.states.get(id);
    if (!state) return false;
    const valid = VALID_TRANSITIONS[state.status];
    return valid?.includes(to) ?? false;
  }

  recordError(id: string, message: string): void {
    const state = this.states.get(id);
    if (state) {
      state.errors.push({ timestamp: new Date(), message });
      if (state.errors.length > 10) {
        state.errors = state.errors.slice(-10);
      }
    }
  }

  saveSnapshot(id: string, snapshot: Record<string, unknown>): void {
    const state = this.states.get(id);
    if (state) {
      state.memorySnapshot = snapshot;
    }
  }

  remove(id: string): void {
    this.states.delete(id);
  }
}

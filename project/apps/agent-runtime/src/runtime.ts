import { createLogger } from '@aasop/observability';
import { AgentLifecycle, type AgentState } from './lifecycle.js';
import { TaskExecutor } from './executor.js';
import { AgentCommunicator } from './communicator.js';
import { AgentSupervisor } from './supervisor.js';

const logger = createLogger('agent-runtime');

interface AgentRuntimeConfig {
  modelRouter: any;
  memoryService: any;
  sandboxManager: any;
  maxConcurrentAgents: number;
  defaultTimeout: number;
}

interface RunningAgent {
  id: string;
  state: AgentState;
  executor: TaskExecutor;
  startedAt: Date;
  timeoutMs: number;
}

export class AgentRuntime {
  private lifecycle: AgentLifecycle;
  private communicator: AgentCommunicator;
  private supervisor: AgentSupervisor;
  private runningAgents = new Map<string, RunningAgent>();
  private config: AgentRuntimeConfig;

  constructor(config: AgentRuntimeConfig) {
    this.config = config;
    this.lifecycle = new AgentLifecycle();
    this.communicator = new AgentCommunicator();
    this.supervisor = new AgentSupervisor();
  }

  async initialize(): Promise<void> {
    await this.supervisor.startMonitoring((agentId: string) => {
      this.handleUnhealthyAgent(agentId);
    });
    logger.info('Agent runtime initialized');
  }

  async spawnAgent(agentId: string, config: { skills: string[]; memoryEnabled: boolean; maxIterations: number }): Promise<AgentState> {
    if (this.runningAgents.size >= this.config.maxConcurrentAgents) {
      throw new Error(`Max concurrent agents reached (${this.config.maxConcurrentAgents})`);
    }

    const state = this.lifecycle.create(agentId, config);
    const executor = new TaskExecutor({
      modelRouter: this.config.modelRouter,
      memoryService: config.memoryEnabled ? this.config.memoryService : null,
      sandboxManager: this.config.sandboxManager,
      maxIterations: config.maxIterations,
      communicator: this.communicator,
    });

    this.runningAgents.set(agentId, {
      id: agentId,
      state,
      executor,
      startedAt: new Date(),
      timeoutMs: this.config.defaultTimeout,
    });

    this.supervisor.registerAgent(agentId);
    this.lifecycle.transition(agentId, 'running');

    logger.info({ agentId, skills: config.skills }, 'Agent spawned');
    return state;
  }

  async executeTask(agentId: string, task: { id: string; type: string; input: Record<string, unknown> }): Promise<unknown> {
    const agent = this.runningAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.state.status !== 'running') {
      throw new Error(`Agent ${agentId} is not running (status: ${agent.state.status})`);
    }

    this.lifecycle.transition(agentId, 'executing');

    try {
      const result = await agent.executor.execute(task, agent.state);

      agent.state.completedTasks++;
      this.lifecycle.transition(agentId, 'running');

      logger.info({ agentId, taskId: task.id }, 'Task executed');
      return result;
    } catch (error) {
      agent.state.failedTasks++;
      this.lifecycle.transition(agentId, 'error');
      logger.error({ agentId, taskId: task.id, error: (error as Error).message }, 'Task execution failed');
      throw error;
    }
  }

  async pauseAgent(agentId: string): Promise<AgentState> {
    const agent = this.runningAgents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    await agent.executor.pause();
    this.lifecycle.transition(agentId, 'paused');
    logger.info({ agentId }, 'Agent paused');
    return agent.state;
  }

  async resumeAgent(agentId: string): Promise<AgentState> {
    const agent = this.runningAgents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    await agent.executor.resume();
    this.lifecycle.transition(agentId, 'running');
    logger.info({ agentId }, 'Agent resumed');
    return agent.state;
  }

  async terminateAgent(agentId: string): Promise<void> {
    const agent = this.runningAgents.get(agentId);
    if (!agent) return;

    await agent.executor.terminate();
    this.lifecycle.transition(agentId, 'terminated');
    this.supervisor.unregisterAgent(agentId);
    this.runningAgents.delete(agentId);
    logger.info({ agentId }, 'Agent terminated');
  }

  getAgentState(agentId: string): AgentState | undefined {
    return this.runningAgents.get(agentId)?.state;
  }

  listAgents(): AgentState[] {
    return Array.from(this.runningAgents.values()).map((a) => a.state);
  }

  private handleUnhealthyAgent(agentId: string): void {
    const agent = this.runningAgents.get(agentId);
    if (!agent) return;

    logger.warn({ agentId, status: agent.state.status }, 'Agent marked unhealthy');
    agent.state.errors.push({
      timestamp: new Date(),
      message: 'Agent marked unhealthy by supervisor',
    });

    if (agent.state.errors.length > 5) {
      this.terminateAgent(agentId).catch((err) => {
        logger.error({ agentId, error: err.message }, 'Failed to terminate unhealthy agent');
      });
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down agent runtime');
    await this.supervisor.stopMonitoring();

    const ids = Array.from(this.runningAgents.keys());
    await Promise.all(ids.map((id) => this.terminateAgent(id).catch(() => {})));

    this.runningAgents.clear();
    logger.info('Agent runtime shut down');
  }
}

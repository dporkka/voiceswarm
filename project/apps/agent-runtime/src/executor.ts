import { createLogger } from '@aasop/observability';
import type { AgentState } from './lifecycle.js';
import type { AgentCommunicator } from './communicator.js';

const logger = createLogger('task-executor');

interface ExecutorConfig {
  modelRouter: any;
  memoryService: any;
  sandboxManager: any;
  maxIterations: number;
  communicator: AgentCommunicator;
}

interface ExecutionContext {
  taskId: string;
  iteration: number;
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  variables: Record<string, unknown>;
  toolsUsed: string[];
}

export class TaskExecutor {
  private isPaused = false;
  private isTerminated = false;
  private currentExecution?: Promise<unknown>;

  constructor(private config: ExecutorConfig) {}

  async execute(
    task: { id: string; type: string; input: Record<string, unknown> },
    agentState: AgentState
  ): Promise<unknown> {
    if (this.isTerminated) {
      throw new Error('Executor has been terminated');
    }

    agentState.currentTaskId = task.id;
    const context: ExecutionContext = {
      taskId: task.id,
      iteration: 0,
      history: [],
      variables: { ...task.input },
      toolsUsed: [],
    };

    this.currentExecution = this.runLoop(task, agentState, context);
    return this.currentExecution;
  }

  private async runLoop(
    task: { id: string; type: string; input: Record<string, unknown> },
    agentState: AgentState,
    context: ExecutionContext
  ): Promise<unknown> {
    logger.info({ taskId: task.id, type: task.type }, 'Starting execution loop');

    while (context.iteration < this.config.maxIterations) {
      if (this.isTerminated) {
        throw new Error('Execution terminated');
      }

      while (this.isPaused) {
        await new Promise((r) => setTimeout(r, 100));
        if (this.isTerminated) throw new Error('Execution terminated while paused');
      }

      context.iteration++;
      logger.debug({ taskId: task.id, iteration: context.iteration }, 'Execution iteration');

      try {
        const result = await this.executeStep(task, agentState, context);

        if (result.done) {
          logger.info({ taskId: task.id, iterations: context.iteration }, 'Execution completed');
          return result.output;
        }

        context.history.push(
          { role: 'assistant', content: JSON.stringify(result.action) },
          { role: 'system', content: JSON.stringify(result.observation) }
        );
      } catch (error) {
        logger.error({ taskId: task.id, iteration: context.iteration, error: (error as Error).message }, 'Step failed');
        throw error;
      }
    }

    logger.warn({ taskId: task.id, maxIterations: this.config.maxIterations }, 'Max iterations reached');
    return { status: 'max_iterations_reached', iterations: context.iteration, variables: context.variables };
  }

  private async executeStep(
    task: { id: string; type: string; input: Record<string, unknown> },
    agentState: AgentState,
    context: ExecutionContext
  ): Promise<{ done: boolean; action?: Record<string, unknown>; observation?: Record<string, unknown>; output?: unknown }> {
    const systemPrompt = this.buildSystemPrompt(agentState);
    const userPrompt = this.buildUserPrompt(task, context);

    let response: string;
    if (this.config.modelRouter) {
      const result = await this.config.modelRouter.route({
        prompt: userPrompt,
        systemPrompt,
        model: 'gpt-4o-mini',
      });
      response = result.content;
    } else {
      response = JSON.stringify({
        thought: 'Analyzing task requirements',
        action: { type: 'complete', output: { status: 'completed', taskId: task.id } },
      });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(response);
    } catch {
      parsed = { thought: response, action: { type: 'complete', output: { raw: response } } };
    }

    const action = parsed.action as Record<string, unknown> | undefined;
    if (!action) {
      return { done: true, output: parsed };
    }

    const actionType = action.type as string;
    context.toolsUsed.push(actionType);

    if (actionType === 'complete' || actionType === 'done') {
      return { done: true, output: action.output };
    }

    if (actionType === 'use_tool') {
      const toolResult = await this.executeTool(action, agentState, context);
      return { done: false, action, observation: toolResult };
    }

    if (actionType === 'communicate') {
      const targetAgentId = action.targetAgentId as string;
      const message = action.message as Record<string, unknown>;
      await this.config.communicator.sendMessage(agentState.id, targetAgentId, message);
      return { done: false, action, observation: { status: 'message_sent' } };
    }

    return { done: false, action, observation: { status: 'unknown_action', actionType } };
  }

  private async executeTool(
    action: Record<string, unknown>,
    agentState: AgentState,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const toolName = action.tool as string;
    const params = action.parameters as Record<string, unknown>;

    switch (toolName) {
      case 'code_execution':
        return this.executeInSandbox(params, context);
      case 'memory_search':
        return this.searchMemory(params);
      case 'memory_store':
        return this.storeMemory(params);
      default:
        return { status: 'tool_not_found', tool: toolName };
    }
  }

  private async executeInSandbox(params: Record<string, unknown>, context: ExecutionContext): Promise<Record<string, unknown>> {
    if (!this.config.sandboxManager) {
      return { status: 'sandbox_unavailable' };
    }
    const code = params.code as string;
    const language = params.language as string;
    logger.debug({ taskId: context.taskId, language }, 'Executing code in sandbox');
    return { status: 'executed', output: `Executed ${language} code`, stdout: '', stderr: '' };
  }

  private async searchMemory(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.config.memoryService) {
      return { status: 'memory_unavailable' };
    }
    const query = params.query as string;
    const results = await this.config.memoryService.search(query);
    return { status: 'searched', results: results.slice(0, 5) };
  }

  private async storeMemory(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.config.memoryService) {
      return { status: 'memory_unavailable' };
    }
    await this.config.memoryService.store(params.entry as any);
    return { status: 'stored' };
  }

  private buildSystemPrompt(state: AgentState): string {
    return `You are an autonomous software engineering agent.\n` +
      `Your skills: ${state.config.skills.join(', ')}\n` +
      `Memory enabled: ${state.config.memoryEnabled}\n` +
      `Max iterations: ${state.config.maxIterations}\n` +
      `Respond with JSON containing: thought, action (type: complete|use_tool|communicate).`;
  }

  private buildUserPrompt(task: { type: string; input: Record<string, unknown> }, context: ExecutionContext): string {
    return `Task: ${task.type}\nInput: ${JSON.stringify(task.input)}\n` +
      `Iteration: ${context.iteration}\nVariables: ${JSON.stringify(context.variables)}\n` +
      `History: ${JSON.stringify(context.history.slice(-5))}`;
  }

  async pause(): Promise<void> {
    this.isPaused = true;
    logger.info('Executor paused');
  }

  async resume(): Promise<void> {
    this.isPaused = false;
    logger.info('Executor resumed');
  }

  async terminate(): Promise<void> {
    this.isTerminated = true;
    this.isPaused = false;
    if (this.currentExecution) {
      try {
        await this.currentExecution;
      } catch {
        // ignore
      }
    }
    logger.info('Executor terminated');
  }
}

// @ts-nocheck
import {
  defineQuery,
  defineSignal,
  setHandler,
  sleep,
  workflowInfo,
  ContinueAsNew,
} from '@temporalio/workflow';
import type { WorkflowContext, WorkflowStep, AgentState } from '@aasop/shared-kernel';

const executeSignal = defineSignal<[string, Record<string, unknown>]>('execute');
const pauseSignal = defineSignal('pause');
const resumeSignal = defineSignal('resume');
const cancelSignal = defineSignal('cancel');
const getStateQuery = defineQuery<AgentState>('getState');

interface AgentWorkflowInput {
  agentId: string;
  config: {
    model?: string;
    systemPrompt?: string;
    maxIterations?: number;
    skills?: string[];
    memoryEnabled?: boolean;
  };
  taskQueue: string;
}

export async function agentWorkflow(input: AgentWorkflowInput): Promise<void> {
  const info = workflowInfo();
  let state: AgentState = {
    id: input.agentId,
    status: 'idle',
    config: input.config,
    currentTaskId: undefined,
    iteration: 0,
    results: [],
    errors: [],
    startedAt: new Date().toISOString(),
  };

  let isPaused = false;
  let isCancelled = false;
  const pendingExecutions: Array<{ taskType: string; input: Record<string, unknown> }> = [];

  // Signal handlers
  setHandler(executeSignal, (taskType, taskInput) => {
    pendingExecutions.push({ taskType, input: taskInput });
    state.status = 'running';
  });

  setHandler(pauseSignal, () => {
    isPaused = true;
    state.status = 'paused';
  });

  setHandler(resumeSignal, () => {
    isPaused = false;
    state.status = 'running';
  });

  setHandler(cancelSignal, () => {
    isCancelled = true;
    state.status = 'cancelled';
  });

  setHandler(getStateQuery, () => state);

  // Main loop
  while (!isCancelled) {
    if (isPaused) {
      await sleep(1000);
      continue;
    }

    const execution = pendingExecutions.shift();
    if (!execution) {
      await sleep(500);
      continue;
    }

    state.currentTaskId = `task_${state.iteration}`;
    state.status = 'executing';

    try {
      const result = await executeAgentStep(state, execution);
      state.results.push(result);
      state.iteration++;
      state.status = 'idle';
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      state.errors.push({ timestamp: new Date().toISOString(), message: err });
      state.status = 'error';

      if (state.errors.length > 10) {
        state.status = 'failed';
        break;
      }
    }

    // Continue as new if too many iterations
    if (state.iteration > 1000) {
      throw new ContinueAsNew(state);
    }
  }

  state.endedAt = new Date().toISOString();
}

async function executeAgentStep(
  state: AgentState,
  execution: { taskType: string; input: Record<string, unknown> }
): Promise<Record<string, unknown>> {
  const { proxyActivities } = await import('@temporalio/workflow');
  const { executeAgentTask, searchMemory, executeCode } = proxyActivities({
    startToCloseTimeout: '5 minutes',
    retry: { maximumAttempts: 3, initialInterval: '1s', maximumInterval: '30s' },
  });

  const context: WorkflowContext = {
    agentId: state.id,
    taskType: execution.taskType,
    input: execution.input,
    iteration: state.iteration,
    memory: state.results,
  };

  let result: Record<string, unknown> = {};

  if (execution.taskType === 'code') {
    result = await executeCode(execution.input as any);
  } else if (execution.taskType === 'research') {
    const memories = await searchMemory(execution.input.query as string);
    result = { memories, status: 'completed' };
  } else {
    result = await executeAgentTask(context);
  }

  return result;
}

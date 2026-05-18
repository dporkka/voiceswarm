// @ts-nocheck
import { defineSignal, defineQuery, setHandler, sleep, proxyActivities, executeChild } from '@temporalio/workflow';
import type { Task } from '@aasop/shared-kernel';

const assignSignal = defineSignal<[string]>('assign');
const completeSignal = defineSignal<[Record<string, unknown>]>('complete');
const failSignal = defineSignal<[string]>('fail');
const getTaskQuery = defineQuery<Task>('getTask');

interface TaskWorkflowInput {
  taskId: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  projectId?: string;
  parentId?: string;
  dependencies?: string[];
}

export async function taskWorkflow(input: TaskWorkflowInput): Promise<Record<string, unknown>> {
  let task: Task = {
    id: input.taskId,
    title: input.title,
    description: input.description,
    type: input.type,
    status: 'pending',
    priority: input.priority as any,
    projectId: input.projectId,
    parentId: input.parentId,
    agentId: undefined,
    orgId: '',
    result: undefined,
    metadata: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let assigned = false;
  let completed = false;
  let failed = false;
  let errorMessage: string | undefined;

  setHandler(assignSignal, (agentId) => {
    task.agentId = agentId;
    task.status = 'assigned';
    assigned = true;
  });

  setHandler(completeSignal, (result) => {
    task.result = result;
    task.status = 'completed';
    completed = true;
  });

  setHandler(failSignal, (error) => {
    errorMessage = error;
    task.status = 'failed';
    failed = true;
  });

  setHandler(getTaskQuery, () => task);

  // Execute dependencies first
  if (input.dependencies && input.dependencies.length > 0) {
    const { checkDependencyStatus } = proxyActivities({
      startToCloseTimeout: '30s',
    });

    for (const depId of input.dependencies) {
      const depStatus = await checkDependencyStatus(depId);
      if (depStatus === 'failed') {
        task.status = 'failed';
        return { task, error: `Dependency ${depId} failed` };
      }
    }
  }

  // Wait for assignment
  task.status = 'in_progress';
  task.updatedAt = new Date().toISOString();

  // Wait for completion signals
  const deadline = Date.now() + 3600000; // 1 hour timeout
  while (!completed && !failed) {
    if (Date.now() > deadline) {
      task.status = 'failed';
      return { task, error: 'Timeout waiting for task completion' };
    }
    await sleep(500);
  }

  task.updatedAt = new Date().toISOString();

  if (failed) {
    return { task, error: errorMessage };
  }

  return { task, status: 'completed' };
}

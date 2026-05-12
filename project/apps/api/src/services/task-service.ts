import { createLogger } from '@aasop/observability';

const logger = createLogger('task-service');

interface Task {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  projectId?: string;
  parentId?: string;
  agentId?: string;
  orgId: string;
  result?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const tasks = new Map<string, Task>();
let counter = 0;

export class TaskService {
  async list(opts: { page: number; limit: number; status?: string; projectId?: string; orgId: string }) {
    let items = Array.from(tasks.values()).filter((t) => t.orgId === opts.orgId);
    if (opts.status) items = items.filter((t) => t.status === opts.status);
    if (opts.projectId) items = items.filter((t) => t.projectId === opts.projectId);
    const total = items.length;
    const start = (opts.page - 1) * opts.limit;
    items = items.slice(start, start + opts.limit);
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async get(id: string, orgId: string): Promise<Task> {
    const task = tasks.get(id);
    if (!task || task.orgId !== orgId) {
      throw Object.assign(new Error('Task not found'), { statusCode: 404, code: 'NotFound' });
    }
    return task;
  }

  async create(
    data: {
      title: string;
      description?: string;
      type: string;
      priority?: string;
      projectId?: string;
      parentId?: string;
      metadata?: Record<string, unknown>;
    },
    orgId: string
  ): Promise<Task> {
    const id = `task_${++counter}_${Date.now()}`;
    const task: Task = {
      id,
      title: data.title,
      description: data.description,
      type: data.type,
      status: 'pending',
      priority: data.priority || 'medium',
      projectId: data.projectId,
      parentId: data.parentId,
      orgId,
      metadata: data.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.set(id, task);
    logger.info({ taskId: id, orgId, type: data.type }, 'Task created');
    return task;
  }

  async update(id: string, data: Partial<Task>, orgId: string): Promise<Task> {
    const existing = await this.get(id, orgId);
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    tasks.set(id, updated);
    logger.info({ taskId: id }, 'Task updated');
    return updated;
  }

  async assign(id: string, agentId: string, orgId: string): Promise<Task> {
    const task = await this.get(id, orgId);
    task.agentId = agentId;
    task.status = 'assigned';
    task.updatedAt = new Date().toISOString();
    logger.info({ taskId: id, agentId }, 'Task assigned');
    return task;
  }

  async complete(id: string, result: Record<string, unknown> | undefined, orgId: string): Promise<Task> {
    const task = await this.get(id, orgId);
    task.status = 'completed';
    task.result = result;
    task.updatedAt = new Date().toISOString();
    logger.info({ taskId: id }, 'Task completed');
    return task;
  }
}

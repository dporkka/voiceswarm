import type { AASOPClient } from './client.js';
import type { Task, TaskStatus, PaginatedResult, PaginationParams } from './types.js';

export interface CreateTaskRequest {
  title: string;
  description?: string;
  type: 'code' | 'review' | 'test' | 'deploy' | 'research' | 'document' | 'custom';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  projectId?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  result?: Record<string, unknown>;
}

export class TaskClient {
  constructor(private client: AASOPClient) {}

  async list(params?: PaginationParams & { status?: TaskStatus; projectId?: string }): Promise<PaginatedResult<Task>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.cursor) queryParams.set('cursor', params.cursor);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.projectId) queryParams.set('projectId', params.projectId);

    const query = queryParams.toString();
    return this.client.request('GET', `/v1/tasks${query ? `?${query}` : ''}`);
  }

  async get(id: string): Promise<Task> {
    return this.client.request('GET', `/v1/tasks/${id}`);
  }

  async create(req: CreateTaskRequest): Promise<Task> {
    return this.client.request('POST', '/v1/tasks', req);
  }

  async update(id: string, req: UpdateTaskRequest): Promise<Task> {
    return this.client.request('PATCH', `/v1/tasks/${id}`, req);
  }

  async assign(id: string, agentId: string): Promise<Task> {
    return this.client.request('POST', `/v1/tasks/${id}/assign`, { agentId });
  }

  async complete(id: string, result?: Record<string, unknown>): Promise<Task> {
    return this.client.request('POST', `/v1/tasks/${id}/complete`, result ? { result } : undefined);
  }
}

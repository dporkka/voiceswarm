import type { AASOPClient } from './client.js';
import type { Workflow, PaginatedResult, PaginationParams } from './types.js';

export interface CreateWorkflowRequest {
  name: string;
  definition: {
    type: string;
    steps: Array<{
      id: string;
      type: string;
      config: Record<string, unknown>;
      dependsOn?: string[];
    }>;
  };
  input?: Record<string, unknown>;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export interface SignalWorkflowRequest {
  signal: string;
  payload?: Record<string, unknown>;
}

export class WorkflowClient {
  constructor(private client: AASOPClient) {}

  async list(params?: PaginationParams): Promise<PaginatedResult<Workflow>> {
    const query = params
      ? new URLSearchParams({
          page: String(params.page ?? 1),
          limit: String(params.limit ?? 20),
          ...(params.cursor ? { cursor: params.cursor } : {}),
        })
      : '';
    return this.client.request('GET', `/v1/workflows${query ? `?${query}` : ''}`);
  }

  async get(id: string): Promise<Workflow> {
    return this.client.request('GET', `/v1/workflows/${id}`);
  }

  async create(req: CreateWorkflowRequest): Promise<Workflow> {
    return this.client.request('POST', '/v1/workflows', req);
  }

  async signal(id: string, req: SignalWorkflowRequest): Promise<Workflow> {
    return this.client.request('POST', `/v1/workflows/${id}/signal`, req);
  }

  async cancel(id: string, reason?: string): Promise<Workflow> {
    return this.client.request('POST', `/v1/workflows/${id}/cancel`, reason ? { reason } : undefined);
  }
}

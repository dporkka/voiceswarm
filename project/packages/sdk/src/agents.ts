import type { AASOPClient } from './client.js';
import type { Agent, AgentConfig, AgentStatus, PaginatedResult, PaginationParams } from './types.js';

export interface CreateAgentRequest {
  name: string;
  description?: string;
  config: AgentConfig;
  projectId?: string;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  config?: Partial<AgentConfig>;
  status?: AgentStatus;
}

export class AgentClient {
  constructor(private client: AASOPClient) {}

  async list(params?: PaginationParams): Promise<PaginatedResult<Agent>> {
    const query = params
      ? new URLSearchParams({
          page: String(params.page ?? 1),
          limit: String(params.limit ?? 20),
          ...(params.cursor ? { cursor: params.cursor } : {}),
        })
      : '';
    return this.client.request('GET', `/v1/agents${query ? `?${query}` : ''}`);
  }

  async get(id: string): Promise<Agent> {
    return this.client.request('GET', `/v1/agents/${id}`);
  }

  async create(req: CreateAgentRequest): Promise<Agent> {
    return this.client.request('POST', '/v1/agents', req);
  }

  async update(id: string, req: UpdateAgentRequest): Promise<Agent> {
    return this.client.request('PATCH', `/v1/agents/${id}`, req);
  }

  async delete(id: string): Promise<void> {
    return this.client.request('DELETE', `/v1/agents/${id}`);
  }

  async execute(id: string, input: Record<string, unknown>): Promise<unknown> {
    return this.client.request('POST', `/v1/agents/${id}/execute`, input);
  }

  async pause(id: string): Promise<Agent> {
    return this.client.request('POST', `/v1/agents/${id}/pause`);
  }

  async resume(id: string): Promise<Agent> {
    return this.client.request('POST', `/v1/agents/${id}/resume`);
  }

  async cancel(id: string): Promise<Agent> {
    return this.client.request('POST', `/v1/agents/${id}/cancel`);
  }
}

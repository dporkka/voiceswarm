// @ts-nocheck
import { createLogger } from '@aasop/observability';

const logger = createLogger('agent-service');

interface AgentConfig {
  model?: string;
  systemPrompt?: string;
  tools?: string[];
  maxIterations?: number;
  memoryEnabled?: boolean;
  sandboxEnabled?: boolean;
  allowedSkills?: string[];
}

interface Agent {
  id: string;
  name: string;
  description?: string;
  config: AgentConfig;
  status: string;
  projectId?: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}

const agents = new Map<string, Agent>();
let counter = 0;

export class AgentService {
  async list(opts: { page: number; limit: number; status?: string; orgId: string }) {
    let items = Array.from(agents.values()).filter((a) => a.orgId === opts.orgId);
    if (opts.status) items = items.filter((a) => a.status === opts.status);
    const total = items.length;
    const start = (opts.page - 1) * opts.limit;
    items = items.slice(start, start + opts.limit);
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async get(id: string, orgId: string): Promise<Agent> {
    const agent = agents.get(id);
    if (!agent || agent.orgId !== orgId) {
      throw Object.assign(new Error('Agent not found'), { statusCode: 404, code: 'NotFound' });
    }
    return agent;
  }

  async create(data: { name: string; description?: string; config: AgentConfig; projectId?: string }, orgId: string): Promise<Agent> {
    const id = `agent_${++counter}_${Date.now()}`;
    const agent: Agent = {
      id,
      name: data.name,
      description: data.description,
      config: data.config,
      status: 'idle',
      projectId: data.projectId,
      orgId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    agents.set(id, agent);
    logger.info({ agentId: id, orgId }, 'Agent created');
    return agent;
  }

  async update(id: string, data: Partial<Agent>, orgId: string): Promise<Agent> {
    const existing = await this.get(id, orgId);
    const updated = {
      ...existing,
      ...data,
      config: { ...existing.config, ...data.config },
      updatedAt: new Date().toISOString(),
    };
    agents.set(id, updated);
    logger.info({ agentId: id }, 'Agent updated');
    return updated;
  }

  async delete(id: string, orgId: string): Promise<void> {
    const existing = await this.get(id, orgId);
    existing.status = 'terminated';
    existing.updatedAt = new Date().toISOString();
    agents.delete(id);
    logger.info({ agentId: id }, 'Agent deleted');
  }

  async execute(id: string, input: Record<string, unknown>, orgId: string): Promise<unknown> {
    const agent = await this.get(id, orgId);
    if (agent.status === 'paused' || agent.status === 'terminated') {
      throw Object.assign(new Error('Agent is not active'), { statusCode: 409, code: 'Conflict' });
    }
    agent.status = 'active';
    agent.updatedAt = new Date().toISOString();
    logger.info({ agentId: id, input }, 'Agent executing');
    return { agentId: id, status: 'executed', input, output: { result: 'execution_result' } };
  }

  async pause(id: string, orgId: string): Promise<Agent> {
    const agent = await this.get(id, orgId);
    agent.status = 'paused';
    agent.updatedAt = new Date().toISOString();
    logger.info({ agentId: id }, 'Agent paused');
    return agent;
  }

  async resume(id: string, orgId: string): Promise<Agent> {
    const agent = await this.get(id, orgId);
    agent.status = 'idle';
    agent.updatedAt = new Date().toISOString();
    logger.info({ agentId: id }, 'Agent resumed');
    return agent;
  }

  async cancel(id: string, orgId: string): Promise<Agent> {
    const agent = await this.get(id, orgId);
    agent.status = 'idle';
    agent.updatedAt = new Date().toISOString();
    logger.info({ agentId: id }, 'Agent cancelled');
    return agent;
  }
}

import { createLogger } from '@aasop/observability';

const logger = createLogger('workflow-service');

interface Workflow {
  id: string;
  name: string;
  definition: {
    type: string;
    steps: Array<{
      id: string;
      type: string;
      config: Record<string, unknown>;
      dependsOn?: string[];
      status?: string;
    }>;
  };
  status: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  projectId?: string;
  orgId: string;
  metadata?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const workflows = new Map<string, Workflow>();
let counter = 0;

export class WorkflowService {
  async list(opts: { page: number; limit: number; orgId: string }) {
    let items = Array.from(workflows.values()).filter((w) => w.orgId === opts.orgId);
    const total = items.length;
    const start = (opts.page - 1) * opts.limit;
    items = items.slice(start, start + opts.limit);
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async get(id: string, orgId: string): Promise<Workflow> {
    const workflow = workflows.get(id);
    if (!workflow || workflow.orgId !== orgId) {
      throw Object.assign(new Error('Workflow not found'), { statusCode: 404, code: 'NotFound' });
    }
    return workflow;
  }

  async create(
    data: {
      name: string;
      definition: { type: string; steps: any[] };
      input?: Record<string, unknown>;
      projectId?: string;
      metadata?: Record<string, unknown>;
    },
    orgId: string
  ): Promise<Workflow> {
    const id = `wf_${++counter}_${Date.now()}`;
    const workflow: Workflow = {
      id,
      name: data.name,
      definition: data.definition,
      status: 'pending',
      input: data.input,
      projectId: data.projectId,
      orgId,
      metadata: data.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    workflows.set(id, workflow);
    logger.info({ workflowId: id, orgId, steps: data.definition.steps.length }, 'Workflow created');
    return workflow;
  }

  async signal(
    id: string,
    data: { signal: string; payload?: Record<string, unknown> },
    orgId: string
  ): Promise<Workflow> {
    const workflow = await this.get(id, orgId);
    workflow.status = 'running';
    workflow.startedAt = new Date().toISOString();
    workflow.updatedAt = new Date().toISOString();

    for (const step of workflow.definition.steps) {
      step.status = 'running';
    }

    logger.info({ workflowId: id, signal: data.signal }, 'Workflow signaled');
    return workflow;
  }

  async cancel(id: string, reason: string | undefined, orgId: string): Promise<Workflow> {
    const workflow = await this.get(id, orgId);
    workflow.status = 'cancelled';
    workflow.updatedAt = new Date().toISOString();
    workflow.completedAt = new Date().toISOString();
    logger.info({ workflowId: id, reason }, 'Workflow cancelled');
    return workflow;
  }
}

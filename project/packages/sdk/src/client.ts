import { AgentClient } from './agents.js';
import { TaskClient } from './tasks.js';
import { WorkflowClient } from './workflows.js';
import { InferenceClient } from './inference.js';

export interface AASOPClientOptions {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export class AASOPClient {
  readonly agents: AgentClient;
  readonly tasks: TaskClient;
  readonly workflows: WorkflowClient;
  readonly inference: InferenceClient;

  private apiKey: string;
  private baseURL: string;
  private timeout: number;
  private retries: number;

  constructor(opts: AASOPClientOptions) {
    this.baseURL = opts.baseURL.replace(/\/$/, '');
    this.apiKey = opts.apiKey || '';
    this.timeout = opts.timeout || 30000;
    this.retries = opts.retries || 3;

    this.agents = new AgentClient(this);
    this.tasks = new TaskClient(this);
    this.workflows = new WorkflowClient(this);
    this.inference = new InferenceClient(this);
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  getTimeout(): number {
    return this.timeout;
  }

  getRetries(): number {
    return this.retries;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: { stream?: boolean } = {}
  ): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.getAuthHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        throw new AASOPAPIError(response.status, error, path);
      }

      if (opts.stream) {
        return response.body as unknown as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof AASOPAPIError) throw error;
      throw new AASOPAPIError(0, (error as Error).message, path);
    }
  }
}

export class AASOPAPIError extends Error {
  constructor(
    public status: number,
    public body: string,
    public path: string
  ) {
    super(`AASOP API Error ${status} on ${path}: ${body}`);
    this.name = 'AASOPAPIError';
  }
}

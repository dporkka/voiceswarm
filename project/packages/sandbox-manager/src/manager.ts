// @ts-nocheck
import { createLogger } from '@aasop/observability';
import { Sandbox } from './sandbox.js';
import { SandboxPool } from './pool.js';
import { DockerClient } from './docker.js';
import type { SecurityProfile } from './security.js';

const logger = createLogger('sandbox-manager');

export interface SandboxConfig {
  id?: string;
  image: string;
  command?: string[];
  env?: Record<string, string>;
  timeoutMs?: number;
  memoryLimit?: string;
  cpuLimit?: string;
  securityProfile?: SecurityProfile;
  networkEnabled?: boolean;
  volumeMounts?: Array<{ host: string; container: string; mode: 'ro' | 'rw' }>;
  workingDir?: string;
  labels?: Record<string, string>;
}

export interface SandboxFilter {
  status?: 'running' | 'stopped' | 'all';
  labels?: Record<string, string>;
}

export interface SandboxInfo {
  id: string;
  containerId: string;
  status: 'running' | 'stopped' | 'error';
  image: string;
  createdAt: Date;
  startedAt?: Date;
  stoppedAt?: Date;
  exitCode?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  labels: Record<string, string>;
}

export interface ExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  memoryUsage?: number;
}

export interface ExecOpts {
  timeout?: number;
  env?: Record<string, string>;
  cwd?: string;
  stdin?: string;
}

export interface SandboxManager {
  createSandbox(config: SandboxConfig): Promise<Sandbox>;
  destroySandbox(id: string): Promise<void>;
  listSandboxes(filter?: SandboxFilter): Promise<SandboxInfo[]>;
  getSandbox(id: string): Promise<Sandbox | undefined>;
}

export class SandboxManagerImpl implements SandboxManager {
  private sandboxes = new Map<string, Sandbox>();
  private pool: SandboxPool;

  constructor(
    private docker: DockerClient,
    poolSize = 3
  ) {
    this.pool = new SandboxPool(docker, poolSize);
  }

  async initialize(): Promise<void> {
    await this.pool.preWarm({
      image: 'node:20-alpine',
      memoryLimit: '512m',
      cpuLimit: '1',
      networkEnabled: false,
    });
    logger.info('Sandbox manager initialized');
  }

  async createSandbox(config: SandboxConfig): Promise<Sandbox> {
    const id = config.id || `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    logger.info({ id, image: config.image }, 'Creating sandbox');

    try {
      const pooled = await this.pool.acquire(config.image);
      if (pooled) {
        const sandbox = new Sandbox(id, pooled.containerId, this.docker, config);
        await sandbox.configure(config);
        this.sandboxes.set(id, sandbox);
        logger.info({ id }, 'Sandbox created from pool');
        return sandbox;
      }

      const containerId = await this.docker.createContainer({
        id,
        image: config.image,
        command: config.command,
        env: config.env,
        memoryLimit: config.memoryLimit,
        cpuLimit: config.cpuLimit,
        networkEnabled: config.networkEnabled,
        volumeMounts: config.volumeMounts,
        workingDir: config.workingDir,
        labels: { ...config.labels, 'aasop.sandbox.id': id },
      });

      await this.docker.startContainer(containerId);

      const sandbox = new Sandbox(id, containerId, this.docker, config);
      this.sandboxes.set(id, sandbox);
      logger.info({ id, containerId }, 'Sandbox created and started');
      return sandbox;
    } catch (error) {
      logger.error({ id, error: (error as Error).message }, 'Failed to create sandbox');
      throw error;
    }
  }

  async destroySandbox(id: string): Promise<void> {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) {
      logger.warn({ id }, 'Sandbox not found for destruction');
      return;
    }

    try {
      await sandbox.stop();
      await this.docker.removeContainer(sandbox.containerId, { force: true });
      this.sandboxes.delete(id);
      logger.info({ id }, 'Sandbox destroyed');
    } catch (error) {
      logger.error({ id, error: (error as Error).message }, 'Failed to destroy sandbox');
      throw error;
    }
  }

  async listSandboxes(filter?: SandboxFilter): Promise<SandboxInfo[]> {
    const containers = await this.docker.listContainers({
      all: filter?.status === 'all',
      filters: { label: ['aasop.sandbox.id'] },
    });

    const results: SandboxInfo[] = [];

    for (const container of containers) {
      const info = await this.docker.inspectContainer(container.Id);
      const sandboxId = info.Config?.Labels?.['aasop.sandbox.id'];
      if (!sandboxId) continue;

      if (filter?.status && filter.status !== 'all') {
        const isRunning = info.State?.Running === true;
        if (filter.status === 'running' && !isRunning) continue;
        if (filter.status === 'stopped' && isRunning) continue;
      }

      if (filter?.labels) {
        const containerLabels = info.Config?.Labels || {};
        const matches = Object.entries(filter.labels).every(
          ([k, v]) => containerLabels[k] === v
        );
        if (!matches) continue;
      }

      results.push({
        id: sandboxId,
        containerId: container.Id,
        status: info.State?.Running ? 'running' : info.State?.ExitCode === 0 ? 'stopped' : 'error',
        image: info.Config?.Image || '',
        createdAt: new Date(info.Created),
        startedAt: info.State?.StartedAt ? new Date(info.State.StartedAt) : undefined,
        stoppedAt: info.State?.FinishedAt ? new Date(info.State.FinishedAt) : undefined,
        exitCode: info.State?.ExitCode,
        memoryUsage: info.State?.MemoryUsage,
        cpuUsage: info.CPUStats?.CPUUsage?.TotalUsage,
        labels: info.Config?.Labels || {},
      });
    }

    return results;
  }

  getSandbox(id: string): Promise<Sandbox | undefined> {
    return Promise.resolve(this.sandboxes.get(id));
  }

  async destroyAll(): Promise<void> {
    const ids = Array.from(this.sandboxes.keys());
    await Promise.all(ids.map((id) => this.destroySandbox(id).catch(() => {})));
    logger.info({ count: ids.length }, 'All sandboxes destroyed');
  }
}

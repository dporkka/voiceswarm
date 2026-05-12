import { createLogger } from '@aasop/observability';
import type { DockerClient } from './docker.js';

const logger = createLogger('sandbox-pool');

interface PooledContainer {
  containerId: string;
  image: string;
  acquired: boolean;
  createdAt: Date;
}

interface PoolConfig {
  image: string;
  memoryLimit?: string;
  cpuLimit?: string;
  networkEnabled?: boolean;
}

export class SandboxPool {
  private pool: PooledContainer[] = [];
  private config?: PoolConfig;

  constructor(
    private docker: DockerClient,
    private size: number
  ) {}

  async preWarm(config: PoolConfig): Promise<void> {
    this.config = config;
    logger.info({ image: config.image, size: this.size }, 'Pre-warming sandbox pool');

    const needed = this.size - this.pool.length;
    const creations = [];

    for (let i = 0; i < needed; i++) {
      creations.push(
        this.docker
          .createContainer({
            id: `pool_${Date.now()}_${i}`,
            image: config.image,
            memoryLimit: config.memoryLimit,
            cpuLimit: config.cpuLimit,
            networkEnabled: config.networkEnabled ?? false,
            labels: { 'aasop.sandbox.pool': 'true' },
          })
          .then(async (containerId) => {
            await this.docker.startContainer(containerId);
            return containerId;
          })
      );
    }

    const containerIds = await Promise.all(creations);

    for (const containerId of containerIds) {
      this.pool.push({
        containerId,
        image: config.image,
        acquired: false,
        createdAt: new Date(),
      });
    }

    logger.info({ count: containerIds.length }, 'Pool pre-warmed');
  }

  async acquire(image: string): Promise<{ containerId: string } | null> {
    const available = this.pool.find((c) => c.image === image && !c.acquired);
    if (available) {
      available.acquired = true;
      logger.debug({ containerId: available.containerId }, 'Acquired pooled container');
      return { containerId: available.containerId };
    }
    return null;
  }

  async release(containerId: string): Promise<void> {
    const pooled = this.pool.find((c) => c.containerId === containerId);
    if (pooled) {
      pooled.acquired = false;
      logger.debug({ containerId }, 'Released pooled container');
    }
  }

  async drain(): Promise<void> {
    logger.info({ count: this.pool.length }, 'Draining sandbox pool');

    await Promise.all(
      this.pool.map(async (c) => {
        try {
          await this.docker.stopContainer(c.containerId, 5);
          await this.docker.removeContainer(c.containerId, { force: true });
        } catch (error) {
          logger.warn({ containerId: c.containerId, error: (error as Error).message }, 'Failed to clean pooled container');
        }
      })
    );

    this.pool = [];
    logger.info('Sandbox pool drained');
  }

  getStats(): { total: number; available: number; acquired: number } {
    return {
      total: this.pool.length,
      available: this.pool.filter((c) => !c.acquired).length,
      acquired: this.pool.filter((c) => c.acquired).length,
    };
  }
}

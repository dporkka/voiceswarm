import { createLogger } from '@aasop/observability';

const logger = createLogger('agent-supervisor');

interface AgentHealth {
  agentId: string;
  lastHeartbeat: Date;
  cpuUsage: number;
  memoryUsage: number;
  taskCount: number;
  errorCount: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

export class AgentSupervisor {
  private agents = new Map<string, AgentHealth>();
  private checkInterval?: ReturnType<typeof setInterval>;
  private unhealthyCallback?: (agentId: string) => void;

  registerAgent(agentId: string): void {
    this.agents.set(agentId, {
      agentId,
      lastHeartbeat: new Date(),
      cpuUsage: 0,
      memoryUsage: 0,
      taskCount: 0,
      errorCount: 0,
      status: 'healthy',
    });
    logger.debug({ agentId }, 'Agent registered with supervisor');
  }

  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    logger.debug({ agentId }, 'Agent unregistered from supervisor');
  }

  heartbeat(agentId: string, metrics: { cpuUsage: number; memoryUsage: number; taskCount: number }): void {
    const health = this.agents.get(agentId);
    if (health) {
      health.lastHeartbeat = new Date();
      health.cpuUsage = metrics.cpuUsage;
      health.memoryUsage = metrics.memoryUsage;
      health.taskCount = metrics.taskCount;
    }
  }

  recordError(agentId: string): void {
    const health = this.agents.get(agentId);
    if (health) {
      health.errorCount++;
    }
  }

  startMonitoring(unhealthyCallback: (agentId: string) => void, intervalMs = 30000): void {
    this.unhealthyCallback = unhealthyCallback;

    this.checkInterval = setInterval(() => {
      const now = new Date();
      for (const [agentId, health] of this.agents) {
        const timeSinceHeartbeat = now.getTime() - health.lastHeartbeat.getTime();

        if (timeSinceHeartbeat > intervalMs * 3) {
          health.status = 'unhealthy';
          logger.warn({ agentId, timeSinceHeartbeat }, 'Agent heartbeat missed');
          this.unhealthyCallback?.(agentId);
        } else if (health.errorCount > 5 || health.memoryUsage > 90) {
          health.status = 'degraded';
          logger.warn({ agentId, errors: health.errorCount, memory: health.memoryUsage }, 'Agent degraded');
        } else {
          health.status = 'healthy';
        }
      }
    }, intervalMs);

    logger.info({ intervalMs }, 'Supervisor monitoring started');
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
    logger.info('Supervisor monitoring stopped');
  }

  getHealth(agentId: string): AgentHealth | undefined {
    return this.agents.get(agentId);
  }

  getAllHealth(): AgentHealth[] {
    return Array.from(this.agents.values());
  }

  getStats(): { total: number; healthy: number; degraded: number; unhealthy: number } {
    const all = this.getAllHealth();
    return {
      total: all.length,
      healthy: all.filter((h) => h.status === 'healthy').length,
      degraded: all.filter((h) => h.status === 'degraded').length,
      unhealthy: all.filter((h) => h.status === 'unhealthy').length,
    };
  }
}

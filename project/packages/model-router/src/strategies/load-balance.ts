import type { RoutingStrategy, ProviderAdapter, ProviderHealth } from '../providers/base.js';
import type { RouteRequest } from '@aasop/shared-kernel';

export class LoadBalancedStrategy implements RoutingStrategy {
  readonly name = 'load-balanced';
  private roundRobinIndex = 0;

  selectProvider(
    providers: ProviderAdapter[],
    health: Map<string, ProviderHealth>,
    request: RouteRequest
  ): ProviderAdapter | null {
    if (providers.length === 0) return null;

    const healthy = providers
      .map((p) => ({
        provider: p,
        score: this.score(p, health.get(p.name)!, request),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    if (healthy.length === 0) return null;

    const idx = this.roundRobinIndex % healthy.length;
    this.roundRobinIndex++;
    return healthy[idx].provider;
  }

  score(provider: ProviderAdapter, health: ProviderHealth, request: RouteRequest): number {
    if (!health || health.status === 'unhealthy') return 0;

    let capacity = 100;
    if (health.requestsPerMinute > 0) {
      const loadRatio = health.requestsPerMinute / 1000;
      capacity = Math.max(1, 100 - loadRatio * 50);
    }

    let penalty = 1;
    if (health.status === 'degraded') penalty = 0.7;
    if (health.errorRate > 0.1) penalty *= 0.6;
    if (health.latency > 3000) penalty *= 0.8;

    return capacity * penalty;
  }
}

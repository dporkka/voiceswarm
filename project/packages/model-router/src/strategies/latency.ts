// @ts-nocheck
import type { RoutingStrategy, ProviderAdapter, ProviderHealth } from '../providers/base.js';
import type { RouteRequest } from '@aasop/shared-kernel';

export class LatencyOptimizedStrategy implements RoutingStrategy {
  readonly name = 'latency-optimized';

  selectProvider(
    providers: ProviderAdapter[],
    health: Map<string, ProviderHealth>,
    request: RouteRequest
  ): ProviderAdapter | null {
    if (providers.length === 0) return null;

    const scored = providers
      .map((p) => ({
        provider: p,
        score: this.score(p, health.get(p.name)!, request),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => a.score - b.score);

    return scored.length > 0 ? scored[0].provider : null;
  }

  score(provider: ProviderAdapter, health: ProviderHealth, request: RouteRequest): number {
    if (!health || health.status === 'unhealthy') return 0;

    let latencyScore = health.latency;
    if (latencyScore <= 0) latencyScore = 500;

    let penalty = 1;
    if (health.status === 'degraded') penalty = 1.5;
    if (health.errorRate > 0.05) penalty *= 1 + health.errorRate * 5;
    if (health.requestsPerMinute > 1000) penalty *= 1.2;

    return latencyScore * penalty;
  }
}

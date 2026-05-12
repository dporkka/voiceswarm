import type { RoutingStrategy, ProviderAdapter, ProviderHealth } from '../providers/base.js';
import type { RouteRequest } from '@aasop/shared-kernel';

export class CostOptimizedStrategy implements RoutingStrategy {
  readonly name = 'cost-optimized';

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

    const estimatedInput = Math.ceil(request.prompt.length / 4);
    const estimatedOutput = 1000;
    const cost = provider.estimateCost({
      inputTokens: estimatedInput,
      outputTokens: estimatedOutput,
      model: request.model || provider.defaultModel,
    });

    let penalty = 1;
    if (health.status === 'degraded') penalty = 2;
    if (health.errorRate > 0.1) penalty *= 1 + health.errorRate * 10;

    return cost * penalty;
  }
}

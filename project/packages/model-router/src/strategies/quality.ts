import type { RoutingStrategy, ProviderAdapter, ProviderHealth } from '../providers/base.js';
import type { RouteRequest } from '@aasop/shared-kernel';

const MODEL_QUALITY_TIERS: Record<string, number> = {
  'gpt-4o': 9.5,
  'gpt-4o-mini': 8.0,
  'gpt-4-turbo': 9.8,
  'claude-3-5-sonnet': 9.7,
  'claude-3-opus': 9.9,
  'claude-3-haiku': 7.5,
  'llama-3.1-70b': 8.5,
  'llama-3.1-8b': 7.0,
};

export class QualityOptimizedStrategy implements RoutingStrategy {
  readonly name = 'quality-optimized';

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
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].provider : null;
  }

  score(provider: ProviderAdapter, health: ProviderHealth, request: RouteRequest): number {
    if (!health || health.status === 'unhealthy') return 0;

    const model = request.model || provider.defaultModel;
    const quality = MODEL_QUALITY_TIERS[model] || 5;

    let penalty = 1;
    if (health.status === 'degraded') penalty = 0.8;
    if (health.errorRate > 0.05) penalty *= 1 - Math.min(health.errorRate, 0.5);
    if (health.latency > 5000) penalty *= 0.9;

    return quality * penalty;
  }
}

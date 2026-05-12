import type { ProviderAdapter, ProviderHealth, RoutingStrategy } from './providers/base.js';
import type { CircuitBreaker } from './circuit-breaker.js';
import { createLogger } from '@aasop/observability';

const logger = createLogger('fallback');

export interface FallbackRule {
  provider: string;
  condition?: 'on-error' | 'on-latency' | 'on-cost' | 'always';
  threshold?: number;
}

export class FallbackChain {
  private rules: FallbackRule[] = [];

  constructor(
    private readonly providers: Map<string, ProviderAdapter>,
    private readonly breakers: Map<string, CircuitBreaker>,
    private readonly health: Map<string, ProviderHealth>
  ) {}

  setRules(rules: FallbackRule[]): void {
    this.rules = rules;
  }

  async execute<T>(
    fn: (provider: ProviderAdapter) => Promise<T>,
    preferredProvider?: string
  ): Promise<{ result: T; provider: string }> {
    const orderedProviders = this.getOrderedProviders(preferredProvider);

    const errors: Array<{ provider: string; error: Error }> = [];

    for (const providerName of orderedProviders) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      const breaker = this.breakers.get(providerName);

      try {
        const result = breaker
          ? await breaker.execute(() => fn(provider))
          : await fn(provider);

        logger.info({ provider: providerName }, 'Fallback provider succeeded');
        return { result, provider: providerName };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.warn({ provider: providerName, error: err.message }, 'Fallback provider failed');
        errors.push({ provider: providerName, error: err });
      }
    }

    const summary = errors.map((e) => `${e.provider}: ${e.error.message}`).join('; ');
    throw new FallbackExhaustedError(`All fallback providers exhausted: ${summary}`);
  }

  private getOrderedProviders(preferred?: string): string[] {
    const providers = new Set<string>();

    if (preferred) providers.add(preferred);

    for (const rule of this.rules) {
      providers.add(rule.provider);
    }

    for (const [name] of this.providers) {
      providers.add(name);
    }

    return Array.from(providers);
  }
}

export class FallbackExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FallbackExhaustedError';
  }
}

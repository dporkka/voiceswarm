// @ts-nocheck
import type { RouteRequest, RouteResult } from '@aasop/shared-kernel';
import { createLogger } from '@aasop/observability';
import type { ProviderAdapter, ProviderHealth, RoutingStrategy } from './providers/base.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { TokenTracker } from './token-tracker.js';
import { FallbackChain } from './fallback.js';

const logger = createLogger('model-router');

export interface RouterOptions {
  defaultStrategy: RoutingStrategy;
  enableCircuitBreaker?: boolean;
  enableTokenTracking?: boolean;
  enableFallback?: boolean;
  fallbackRules?: Array<{ provider: string; condition?: string; threshold?: number }>;
}

export class ModelRouter {
  private providers = new Map<string, ProviderAdapter>();
  private breakers = new Map<string, CircuitBreaker>();
  private health = new Map<string, ProviderHealth>();
  private strategy: RoutingStrategy;
  private tokenTracker: TokenTracker;
  private fallbackChain?: FallbackChain;
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private requestCounter = 0;

  constructor(private options: RouterOptions) {
    this.strategy = options.defaultStrategy;
    this.tokenTracker = new TokenTracker();

    if (options.enableFallback !== false) {
      this.fallbackChain = new FallbackChain(this.providers, this.breakers, this.health);
      if (options.fallbackRules) {
        this.fallbackChain.setRules(options.fallbackRules);
      }
    }
  }

  registerProvider(provider: ProviderAdapter): void {
    this.providers.set(provider.name, provider);

    if (this.options.enableCircuitBreaker !== false) {
      this.breakers.set(provider.name, new CircuitBreaker(provider.name));
    }

    logger.info({ provider: provider.name, models: provider.models }, 'Provider registered');
  }

  setStrategy(strategy: RoutingStrategy): void {
    logger.info({ strategy: strategy.name }, 'Routing strategy changed');
    this.strategy = strategy;
  }

  getProviderHealth(): ProviderHealth[] {
    return Array.from(this.health.values());
  }

  async route(request: RouteRequest): Promise<RouteResult> {
    const requestId = `req_${++this.requestCounter}_${Date.now()}`;
    const start = Date.now();

    logger.info({ requestId, model: request.model, strategy: this.strategy.name }, 'Routing request');

    const providers = Array.from(this.providers.values());
    if (providers.length === 0) {
      throw new Error('No providers registered');
    }

    const provider = this.strategy.selectProvider(providers, this.health, request);
    if (!provider) {
      throw new Error('No healthy provider available');
    }

    const model = request.model || provider.defaultModel;
    const providerName = provider.name;

    try {
      const generateFn = (p: ProviderAdapter) => p.generate(request, model);

      let response;
      if (this.fallbackChain && this.options.enableFallback !== false) {
        const fallbackResult = await this.fallbackChain.execute(generateFn, providerName);
        response = fallbackResult.result;
      } else {
        const breaker = this.breakers.get(providerName);
        response = breaker
          ? await breaker.execute(() => generateFn(provider))
          : await generateFn(provider);
      }

      const latency = Date.now() - start;
      const cost = this.tokenTracker.calculateCost(model, response.usage.input, response.usage.output);

      const result: RouteResult = {
        content: response.content,
        usage: response.usage,
        provider: providerName,
        model: response.model,
        latency,
        cost,
      };

      if (this.options.enableTokenTracking !== false) {
        this.tokenTracker.track({
          requestId,
          provider: providerName,
          model: response.model,
          inputTokens: response.usage.input,
          outputTokens: response.usage.output,
          totalTokens: response.usage.total,
          cost,
          latency,
        });
      }

      logger.info(
        { requestId, provider: providerName, model, latency, cost },
        'Request routed successfully'
      );

      return result;
    } catch (error) {
      logger.error(
        { requestId, provider: providerName, error: (error as Error).message },
        'Routing failed'
      );
      throw error;
    }
  }

  async stream(request: RouteRequest): Promise<AsyncIterable<{ content: string; done: boolean }>> {
    const providers = Array.from(this.providers.values());
    const provider = this.strategy.selectProvider(providers, this.health, request);
    if (!provider) {
      throw new Error('No healthy provider available');
    }

    const model = request.model || provider.defaultModel;
    return provider.stream(request, model);
  }

  startHealthChecks(intervalMs = 30000): void {
    if (this.healthCheckInterval) return;

    const check = async () => {
      for (const [name, provider] of this.providers) {
        try {
          const health = await provider.getHealth();
          this.health.set(name, health);
        } catch (error) {
          this.health.set(name, {
            provider: name,
            status: 'unhealthy',
            latency: -1,
            lastChecked: new Date(),
            errorRate: 1,
            requestsPerMinute: 0,
          });
        }
      }
    };

    check();
    this.healthCheckInterval = setInterval(check, intervalMs);
  }

  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  getTokenTracker(): TokenTracker {
    return this.tokenTracker;
  }

  destroy(): void {
    this.stopHealthChecks();
    this.providers.clear();
    this.breakers.clear();
    this.health.clear();
  }
}

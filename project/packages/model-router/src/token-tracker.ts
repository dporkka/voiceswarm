// @ts-nocheck
import { createLogger } from '@aasop/observability';

const logger = createLogger('token-tracker');

export interface TokenUsage {
  requestId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latency: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface CostEstimate {
  minCost: number;
  maxCost: number;
  expectedCost: number;
  inputRate: number;
  outputRate: number;
}

const COST_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 5.0, output: 15.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'claude-3-5-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'llama-3.1-70b': { input: 0.9, output: 0.9 },
  'llama-3.1-8b': { input: 0.1, output: 0.1 },
  'default': { input: 1.0, output: 3.0 },
};

export class TokenTracker {
  private usages: TokenUsage[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory = 10000) {
    this.maxHistory = maxHistory;
  }

  track(usage: Omit<TokenUsage, 'timestamp'>): TokenUsage {
    const entry: TokenUsage = { ...usage, timestamp: new Date() };
    this.usages.push(entry);

    if (this.usages.length > this.maxHistory) {
      this.usages = this.usages.slice(-this.maxHistory);
    }

    logger.debug(
      { requestId: usage.requestId, provider: usage.provider, tokens: usage.totalTokens, cost: usage.cost },
      'Token usage tracked'
    );

    return entry;
  }

  estimateCost(model: string, inputTokens: number, outputTokens: number): CostEstimate {
    const rates = this.getRates(model);
    const inputCost = (inputTokens / 1_000_000) * rates.input;
    const outputCost = (outputTokens / 1_000_000) * rates.output;
    const expectedOutput = Math.max(outputTokens, Math.ceil(inputTokens * 0.5));
    const expectedCost = (inputTokens / 1_000_000) * rates.input + (expectedOutput / 1_000_000) * rates.output;

    return {
      minCost: inputCost,
      maxCost: inputCost + outputCost * 4,
      expectedCost,
      inputRate: rates.input,
      outputRate: rates.output,
    };
  }

  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const rates = this.getRates(model);
    return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
  }

  getAggregates(timeWindowMs?: number): {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    avgLatency: number;
  } {
    let usages = this.usages;
    if (timeWindowMs) {
      const cutoff = Date.now() - timeWindowMs;
      usages = usages.filter((u) => u.timestamp.getTime() >= cutoff);
    }

    const totalRequests = usages.length;
    const totalInputTokens = usages.reduce((sum, u) => sum + u.inputTokens, 0);
    const totalOutputTokens = usages.reduce((sum, u) => sum + u.outputTokens, 0);
    const totalCost = usages.reduce((sum, u) => sum + u.cost, 0);
    const avgLatency = totalRequests > 0 ? usages.reduce((sum, u) => sum + u.latency, 0) / totalRequests : 0;

    return { totalRequests, totalInputTokens, totalOutputTokens, totalCost, avgLatency };
  }

  getProviderBreakdown(): Map<string, { requests: number; tokens: number; cost: number }> {
    const map = new Map<string, { requests: number; tokens: number; cost: number }>();
    for (const usage of this.usages) {
      const existing = map.get(usage.provider) || { requests: 0, tokens: 0, cost: 0 };
      existing.requests++;
      existing.tokens += usage.totalTokens;
      existing.cost += usage.cost;
      map.set(usage.provider, existing);
    }
    return map;
  }

  private getRates(model: string): { input: number; output: number } {
    return COST_PER_MILLION_TOKENS[model] || COST_PER_MILLION_TOKENS['default'];
  }
}

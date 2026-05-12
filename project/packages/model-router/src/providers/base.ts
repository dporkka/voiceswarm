import type { RouteRequest, RouteResult } from '@aasop/shared-kernel';

export interface ProviderAdapter {
  readonly name: string;
  readonly models: string[];
  readonly defaultModel: string;
  readonly supportsStreaming: boolean;

  generate(request: RouteRequest, model: string): Promise<ProviderResponse>;
  stream(request: RouteRequest, model: string): AsyncIterable<StreamChunk>;
  getHealth(): Promise<ProviderHealth>;
  estimateCost(tokens: TokenEstimate): number;
}

export interface ProviderResponse {
  content: string;
  usage: { input: number; output: number; total: number };
  latency: number;
  model: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  usage?: { input: number; output: number; total: number };
}

export interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastChecked: Date;
  errorRate: number;
  requestsPerMinute: number;
}

export interface TokenEstimate {
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface RoutingStrategy {
  name: string;
  selectProvider(
    providers: ProviderAdapter[],
    health: Map<string, ProviderHealth>,
    request: RouteRequest
  ): ProviderAdapter | null;
  score(provider: ProviderAdapter, health: ProviderHealth, request: RouteRequest): number;
}

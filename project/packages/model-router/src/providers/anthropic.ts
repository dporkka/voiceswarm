// @ts-nocheck
import type { RouteRequest } from '@aasop/shared-kernel';
import type { ProviderAdapter, ProviderHealth, ProviderResponse, StreamChunk } from './base.js';
import { createLogger } from '@aasop/observability';

const logger = createLogger('anthropic-provider');

interface AnthropicMessageResponse {
  content: Array<{ type: string; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
}

interface AnthropicStreamChunk {
  type: string;
  delta?: { type: string; text: string };
  usage?: { input_tokens: number; output_tokens: number };
}

export class AnthropicProvider implements ProviderAdapter {
  readonly name = 'anthropic';
  readonly models = ['claude-3-5-sonnet', 'claude-3-haiku', 'claude-3-opus'];
  readonly defaultModel = 'claude-3-5-sonnet';
  readonly supportsStreaming = true;

  constructor(
    private apiKey: string,
    private baseURL = 'https://api.anthropic.com'
  ) {}

  async generate(request: RouteRequest, model: string): Promise<ProviderResponse> {
    const start = Date.now();
    const messages = this.buildMessages(request);

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || this.defaultModel,
        messages,
        max_tokens: 4096,
        system: request.systemPrompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as AnthropicMessageResponse;
    const latency = Date.now() - start;

    return {
      content: data.content?.map((c) => c.text).join('') || '',
      usage: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0,
        total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      latency,
      model: data.model,
    };
  }

  async *stream(request: RouteRequest, model: string): AsyncIterable<StreamChunk> {
    const messages = this.buildMessages(request);

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || this.defaultModel,
        messages,
        max_tokens: 4096,
        system: request.systemPrompt,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic streaming error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          yield { content: '', done: true };
          return;
        }

        try {
          const parsed = JSON.parse(data) as AnthropicStreamChunk;
          if (parsed.type === 'content_block_delta') {
            yield {
              content: parsed.delta?.text || '',
              done: false,
            };
          }
        } catch {
          // skip parse errors
        }
      }
    }

    yield { content: '', done: true };
  }

  async getHealth(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseURL}/v1/models`, {
        headers: { 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
      });
      return {
        provider: this.name,
        status: response.ok ? 'healthy' : 'degraded',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: response.ok ? 0 : 0.5,
        requestsPerMinute: 0,
      };
    } catch {
      return {
        provider: this.name,
        status: 'unhealthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: 1,
        requestsPerMinute: 0,
      };
    }
  }

  estimateCost(tokens: { inputTokens: number; outputTokens: number; model: string }): number {
    const rates: Record<string, { input: number; output: number }> = {
      'claude-3-5-sonnet': { input: 3.0, output: 15.0 },
      'claude-3-haiku': { input: 0.25, output: 1.25 },
      'claude-3-opus': { input: 15.0, output: 75.0 },
    };
    const r = rates[tokens.model] || rates['claude-3-5-sonnet'];
    return (tokens.inputTokens / 1_000_000) * r.input + (tokens.outputTokens / 1_000_000) * r.output;
  }

  private buildMessages(request: RouteRequest): Array<{ role: 'user' | 'assistant'; content: string }> {
    return [{ role: 'user', content: request.prompt }];
  }
}

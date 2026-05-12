import OpenAI from 'openai';
import type { RouteRequest } from '@aasop/shared-kernel';
import type { ProviderAdapter, ProviderHealth, ProviderResponse, StreamChunk } from './base.js';
import { createLogger } from '@aasop/observability';

const logger = createLogger('openai-provider');

export class OpenAIProvider implements ProviderAdapter {
  readonly name = 'openai';
  readonly models = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  readonly defaultModel = 'gpt-4o-mini';
  readonly supportsStreaming = true;

  private client: OpenAI;

  constructor(apiKey: string, private baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async generate(request: RouteRequest, model: string): Promise<ProviderResponse> {
    const start = Date.now();
    const messages = this.buildMessages(request);

    const response = await this.client.chat.completions.create({
      model: model || this.defaultModel,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
      response_format: request.structured ? { type: 'json_object' } : undefined,
    });

    const latency = Date.now() - start;
    const choice = response.choices[0];

    return {
      content: choice?.message?.content || '',
      usage: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
      latency,
      model: response.model,
    };
  }

  async *stream(request: RouteRequest, model: string): AsyncIterable<StreamChunk> {
    const messages = this.buildMessages(request);

    const stream = await this.client.chat.completions.create({
      model: model || this.defaultModel,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const done = chunk.choices[0]?.finish_reason != null;

      yield {
        content,
        done,
        usage: chunk.usage
          ? {
              input: chunk.usage.prompt_tokens,
              output: chunk.usage.completion_tokens,
              total: chunk.usage.total_tokens,
            }
          : undefined,
      };
    }
  }

  async getHealth(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      await this.client.models.list();
      return {
        provider: this.name,
        status: 'healthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: 0,
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
      'gpt-4o': { input: 5.0, output: 15.0 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gpt-4-turbo': { input: 10.0, output: 30.0 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    };
    const r = rates[tokens.model] || rates['gpt-4o'];
    return (tokens.inputTokens / 1_000_000) * r.input + (tokens.outputTokens / 1_000_000) * r.output;
  }

  private buildMessages(request: RouteRequest): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });
    return messages;
  }
}

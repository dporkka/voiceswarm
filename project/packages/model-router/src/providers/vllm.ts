// @ts-nocheck
import type { RouteRequest } from '@aasop/shared-kernel';
import type { ProviderAdapter, ProviderHealth, ProviderResponse, StreamChunk } from './base.js';
import { createLogger } from '@aasop/observability';

const logger = createLogger('vllm-provider');

interface VLLMCompletionResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string | null;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model: string;
}

interface VLLMModelEntry {
  id: string;
}

interface VLLMModelsResponse {
  data: VLLMModelEntry[];
}

export class VLLMProvider implements ProviderAdapter {
  readonly name = 'vllm';
  readonly models: string[] = [];
  readonly defaultModel = 'llama-3.1-70b';
  readonly supportsStreaming = true;

  constructor(
    private baseURL: string,
    private apiKey?: string
  ) {}

  async generate(request: RouteRequest, model: string): Promise<ProviderResponse> {
    const start = Date.now();
    const messages = this.buildMessages(request);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || this.defaultModel,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`vLLM API error: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as VLLMCompletionResponse;
    const latency = Date.now() - start;

    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0,
      },
      latency,
      model: data.model || (model || this.defaultModel),
    };
  }

  async *stream(request: RouteRequest, model: string): AsyncIterable<StreamChunk> {
    const messages = this.buildMessages(request);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || this.defaultModel,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`vLLM streaming error: ${response.status}`);
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
          const parsed = JSON.parse(data) as VLLMCompletionResponse;
          const content = parsed.choices[0]?.message?.content || parsed.choices[0]?.delta?.content || '';
          const isDone = parsed.choices[0]?.finish_reason != null;
          yield {
            content: content || '',
            done: isDone,
            usage: parsed.usage
              ? {
                  input: parsed.usage.prompt_tokens,
                  output: parsed.usage.completion_tokens,
                  total: parsed.usage.total_tokens,
                }
              : undefined,
          };
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
      const headers: Record<string, string> = {};
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

      const response = await fetch(`${this.baseURL}/v1/models`, { headers });
      if (response.ok) {
        const data = (await response.json()) as VLLMModelsResponse;
        this.models.length = 0;
        this.models.push(...data.data.map((m) => m.id));
      }
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
      'llama-3.1-70b': { input: 0.9, output: 0.9 },
      'llama-3.1-8b': { input: 0.1, output: 0.1 },
      'default': { input: 0.5, output: 0.5 },
    };
    const r = rates[tokens.model] || rates['default'];
    return (tokens.inputTokens / 1_000_000) * r.input + (tokens.outputTokens / 1_000_000) * r.output;
  }

  private buildMessages(request: RouteRequest): Array<{ role: 'system' | 'user'; content: string }> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });
    return messages;
  }
}

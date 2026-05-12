import type { AASOPClient } from './client.js';
import type { RouteResult } from './types.js';

export interface ChatCompletionRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  routing?: {
    strategy?: 'cost' | 'latency' | 'quality' | 'load-balance';
    providers?: string[];
    maxCost?: number;
    maxLatency?: number;
  };
  stream?: boolean;
  structured?: Record<string, unknown>;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export class InferenceClient {
  constructor(private client: AASOPClient) {}

  async chat(req: ChatCompletionRequest): Promise<RouteResult> {
    return this.client.request('POST', '/v1/inference/chat', req);
  }

  async stream(req: ChatCompletionRequest): Promise<ReadableStream<Uint8Array>> {
    return this.client.request<ReadableStream<Uint8Array>>('POST', '/v1/inference/stream', req, {
      stream: true,
    });
  }

  async *streamChat(req: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
    const stream = await this.stream(req);
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((l) => l.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }
            try {
              const parsed = JSON.parse(data) as StreamChunk;
              yield parsed;
            } catch {
              // skip
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

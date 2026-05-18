/**
 * Model and inference types.
 * Defines schemas for LLM interactions and model configurations.
 */

export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  VLLM = 'vllm',
  OLLAMA = 'ollama',
  AZURE_OPENAI = 'azure_openai',
  GOOGLE = 'google',
  CUSTOM = 'custom',
}

export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
}

/** A message in a conversation */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/** A tool/function call from the model */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/** Tool definition for model */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    strict?: boolean;
  };
}

/** Model configuration */
export interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences: string[];
  timeoutMs: number;
  retries: number;
  streaming: boolean;
}

/** Inference request */
export interface InferenceRequest {
  id: string;
  modelConfig: ModelConfig;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  toolChoice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
  responseFormat?: { type: 'text' | 'json_object' | 'json_schema'; schema?: Record<string, unknown> };
  systemPrompt?: string;
  metadata: Record<string, unknown>;
}

/** Token usage breakdown */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptCacheHitTokens?: number;
  promptCacheMissTokens?: number;
}

/** Inference response */
export interface InferenceResponse {
  id: string;
  requestId: string;
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
  usage: TokenUsage;
  model: string;
  provider: ModelProvider;
  durationMs: number;
  createdAt: Date;
}

/** Streaming chunk */
export interface InferenceStreamChunk {
  id: string;
  requestId: string;
  content: string;
  toolCalls?: ToolCall[];
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  usage?: TokenUsage;
  isDone: boolean;
}

/** Inference error */
export interface InferenceError {
  requestId: string;
  code: string;
  message: string;
  providerErrorCode?: string;
  providerErrorMessage?: string;
  retryable: boolean;
  timestamp: Date;
}

/** Provider health status */
export interface ProviderHealth {
  provider: ModelProvider;
  modelId: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  latencyMs: number;
  errorRate: number;
  lastCheckedAt: Date;
  nextCheckAt: Date;
}

/** Inference metrics for observability */
export interface InferenceMetrics {
  requestId: string;
  model: string;
  provider: ModelProvider;
  durationMs: number;
  tokensPerSecond: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  success: boolean;
  cached: boolean;
  timestamp: Date;
}

/** Simplified routing request used by the model-router package. */
export interface RouteRequest {
  prompt: string;
  model?: string;
  systemPrompt?: string;
  structured?: boolean;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

/** Simplified routing result returned by the model-router package. */
export interface RouteResult {
  content: string;
  usage: { input: number; output: number; total: number };
  provider: string;
  model: string;
  latency: number;
  cost: number;
}

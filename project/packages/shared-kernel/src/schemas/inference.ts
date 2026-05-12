import { z } from 'zod';
import { ModelProvider, MessageRole } from '../types/inference.js';

/** Zod schema for ModelProvider enum */
export const ModelProviderSchema = z.nativeEnum(ModelProvider);

/** Zod schema for MessageRole enum */
export const MessageRoleSchema = z.nativeEnum(MessageRole);

/** Zod schema for ToolCall */
export const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});

/** Zod schema for ToolDefinition */
export const ToolDefinitionSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.unknown()),
    strict: z.boolean().optional(),
  }),
});

/** Zod schema for ChatMessage */
export const ChatMessageSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  name: z.string().optional(),
  toolCalls: z.array(ToolCallSchema).optional(),
  toolCallId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.date(),
});

/** Zod schema for ModelConfig */
export const ModelConfigSchema = z.object({
  provider: ModelProviderSchema,
  modelId: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(4096),
  topP: z.number().min(0).max(1).default(1),
  frequencyPenalty: z.number().min(-2).max(2).default(0),
  presencePenalty: z.number().min(-2).max(2).default(0),
  stopSequences: z.array(z.string()).default([]),
  timeoutMs: z.number().int().positive().default(60000),
  retries: z.number().int().nonnegative().default(3),
  streaming: z.boolean().default(false),
});

/** Zod schema for InferenceRequest */
export const InferenceRequestSchema = z.object({
  id: z.string().uuid(),
  modelConfig: ModelConfigSchema,
  messages: z.array(ChatMessageSchema).min(1),
  tools: z.array(ToolDefinitionSchema).optional(),
  toolChoice: z
    .union([
      z.enum(['none', 'auto', 'required']),
      z.object({
        type: z.literal('function'),
        function: z.object({ name: z.string() }),
      }),
    ])
    .optional(),
  responseFormat: z
    .object({
      type: z.enum(['text', 'json_object', 'json_schema']),
      schema: z.record(z.unknown()).optional(),
    })
    .optional(),
  systemPrompt: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});

/** Zod schema for TokenUsage */
export const TokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  promptCacheHitTokens: z.number().int().nonnegative().optional(),
  promptCacheMissTokens: z.number().int().nonnegative().optional(),
});

/** Zod schema for InferenceResponse */
export const InferenceResponseSchema = z.object({
  id: z.string(),
  requestId: z.string().uuid(),
  content: z.string(),
  toolCalls: z.array(ToolCallSchema).optional(),
  finishReason: z.enum(['stop', 'length', 'tool_calls', 'content_filter', 'error']),
  usage: TokenUsageSchema,
  model: z.string(),
  provider: ModelProviderSchema,
  durationMs: z.number().int().nonnegative(),
  createdAt: z.date(),
});

/** Zod schema for InferenceStreamChunk */
export const InferenceStreamChunkSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  content: z.string(),
  toolCalls: z.array(ToolCallSchema).optional(),
  finishReason: z.enum(['stop', 'length', 'tool_calls', 'content_filter']).optional(),
  usage: TokenUsageSchema.optional(),
  isDone: z.boolean(),
});

/** Zod schema for InferenceError */
export const InferenceErrorSchema = z.object({
  requestId: z.string(),
  code: z.string(),
  message: z.string(),
  providerErrorCode: z.string().optional(),
  providerErrorMessage: z.string().optional(),
  retryable: z.boolean(),
  timestamp: z.date(),
});

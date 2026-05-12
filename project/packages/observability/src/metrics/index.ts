/**
 * Prometheus metrics collection and registry.
 */

import { Registry, Counter, Histogram, Gauge, Summary, type Pushgateway } from 'prom-client';
import { z } from 'zod';

/** Metrics configuration schema */
export const MetricsConfigSchema = z.object({
  prefix: z.string().default('aasop'),
  defaultLabels: z.record(z.string()).default({}),
  defaultBuckets: z.array(z.number()).default([0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]),
  collectDefaultMetrics: z.boolean().default(true),
});

export type MetricsConfig = z.infer<typeof MetricsConfigSchema>;

// ==================== Global Registry ====================

let globalRegistry: Registry | null = null;
let globalConfig: MetricsConfig | null = null;
const metricCache = new Map<string, Counter<string> | Histogram<string> | Gauge<string> | Summary<string>>();

/** Initialize the metrics system */
export function initMetrics(config?: Partial<MetricsConfig>): Registry {
  const cfg = MetricsConfigSchema.parse(config);
  globalConfig = cfg;

  globalRegistry = new Registry();
  globalRegistry.setDefaultLabels(cfg.defaultLabels);

  if (cfg.collectDefaultMetrics) {
    // Default Node.js metrics will be collected when prom-client's collectDefaultMetrics is called
    // This is handled lazily
  }

  return globalRegistry;
}

/** Get the global registry */
export function getRegistry(): Registry {
  if (!globalRegistry) {
    return initMetrics();
  }
  return globalRegistry;
}

/** Get metrics in Prometheus exposition format */
export async function getMetrics(): Promise<string> {
  return getRegistry().metrics();
}

/** Reset all metrics (useful for testing) */
export function resetMetrics(): void {
  metricCache.clear();
  globalRegistry = null;
}

// ==================== Metric Helpers ====================

function getPrefixedName(name: string): string {
  const prefix = globalConfig?.prefix ?? 'aasop';
  return `${prefix}_${name}`;
}

/** Get or create a counter metric */
export function getCounter(name: string, help: string, labelNames: string[] = []): Counter<string> {
  const fullName = getPrefixedName(name);
  const cached = metricCache.get(fullName);
  if (cached && cached instanceof Counter) return cached;

  const counter = new Counter({
    name: fullName,
    help,
    labelNames,
    registers: [getRegistry()],
  });
  metricCache.set(fullName, counter);
  return counter;
}

/** Get or create a histogram metric */
export function getHistogram(
  name: string,
  help: string,
  labelNames: string[] = [],
  buckets?: number[],
): Histogram<string> {
  const fullName = getPrefixedName(name);
  const cached = metricCache.get(fullName);
  if (cached && cached instanceof Histogram) return cached;

  const histogram = new Histogram({
    name: fullName,
    help,
    labelNames,
    buckets: buckets ?? globalConfig?.defaultBuckets,
    registers: [getRegistry()],
  });
  metricCache.set(fullName, histogram);
  return histogram;
}

/** Get or create a gauge metric */
export function getGauge(name: string, help: string, labelNames: string[] = []): Gauge<string> {
  const fullName = getPrefixedName(name);
  const cached = metricCache.get(fullName);
  if (cached && cached instanceof Gauge) return cached;

  const gauge = new Gauge({
    name: fullName,
    help,
    labelNames,
    registers: [getRegistry()],
  });
  metricCache.set(fullName, gauge);
  return gauge;
}

// ==================== Pre-defined Metrics ====================

/** HTTP request duration metric */
export const httpRequestDuration = (): Histogram<string> =>
  getHistogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'route', 'status_code', 'service'],
  );

/** HTTP request total counter */
export const httpRequestTotal = (): Counter<string> =>
  getCounter(
    'http_requests_total',
    'Total number of HTTP requests',
    ['method', 'route', 'status_code', 'service'],
  );

/** Active connections gauge */
export const activeConnections = (): Gauge<string> =>
  getGauge('active_connections', 'Number of active connections', ['service']);

/** Database query duration */
export const dbQueryDuration = (): Histogram<string> =>
  getHistogram(
    'db_query_duration_seconds',
    'Database query duration in seconds',
    ['operation', 'table'],
  );

/** Inference request duration */
export const inferenceDuration = (): Histogram<string> =>
  getHistogram(
    'inference_request_duration_seconds',
    'LLM inference request duration in seconds',
    ['provider', 'model', 'status'],
  );

/** Inference token usage counter */
export const inferenceTokensTotal = (): Counter<string> =>
  getCounter(
    'inference_tokens_total',
    'Total number of tokens used',
    ['provider', 'model', 'token_type'],
  );

/** Task execution duration */
export const taskExecutionDuration = (): Histogram<string> =>
  getHistogram(
    'task_execution_duration_seconds',
    'Task execution duration in seconds',
    ['type', 'status', 'agent_role'],
  );

/** Active agents gauge */
export const activeAgents = (): Gauge<string> =>
  getGauge('active_agents', 'Number of active agents', ['project', 'role', 'state']);

/** Agent token usage counter */
export const agentTokensTotal = (): Counter<string> =>
  getCounter('agent_tokens_total', 'Total tokens consumed by agents', ['agent_id', 'model']);

/** Workflow execution duration */
export const workflowExecutionDuration = (): Histogram<string> =>
  getHistogram(
    'workflow_execution_duration_seconds',
    'Workflow execution duration in seconds',
    ['workflow', 'status'],
  );

/** Sandbox lifecycle duration */
export const sandboxLifecycleDuration = (): Histogram<string> =>
  getHistogram(
    'sandbox_lifecycle_duration_seconds',
    'Sandbox lifecycle operation duration',
    ['operation', 'runtime'],
  );

/** Cache hit/miss counter */
export const cacheOperationsTotal = (): Counter<string> =>
  getCounter(
    'cache_operations_total',
    'Total cache operations',
    ['operation', 'result', 'cache_type'],
  );

/** Message queue operations */
export const messageQueueOperationsTotal = (): Counter<string> =>
  getCounter(
    'message_queue_operations_total',
    'Total message queue operations',
    ['operation', 'queue', 'result'],
  );

// ==================== Metric Recording Helpers ====================

/** Record an HTTP request metric */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationMs: number,
  service = 'aasop',
): void {
  const labels = { method, route, status_code: String(statusCode), service };
  httpRequestTotal().inc(labels);
  httpRequestDuration().observe(labels, durationMs / 1000);
}

/** Record an inference call */
export function recordInference(
  provider: string,
  model: string,
  status: string,
  durationMs: number,
  promptTokens: number,
  completionTokens: number,
): void {
  const labels = { provider, model, status };
  inferenceDuration().observe(labels, durationMs / 1000);
  inferenceTokensTotal().inc({ provider, model, token_type: 'prompt' }, promptTokens);
  inferenceTokensTotal().inc({ provider, model, token_type: 'completion' }, completionTokens);
}

/** Record a task execution */
export function recordTaskExecution(
  type: string,
  status: string,
  agentRole: string,
  durationMs: number,
): void {
  taskExecutionDuration().observe({ type, status, agent_role: agentRole }, durationMs / 1000);
}

/** Record a cache operation */
export function recordCacheOperation(operation: 'get' | 'set' | 'delete', result: 'hit' | 'miss' | 'error', cacheType = 'redis'): void {
  cacheOperationsTotal().inc({ operation, result, cache_type: cacheType });
}

/** Record a database query */
export function recordDbQuery(operation: string, table: string, durationMs: number): void {
  dbQueryDuration().observe({ operation, table }, durationMs / 1000);
}

/**
 * OpenTelemetry tracer setup for distributed tracing.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { trace, type Tracer, type Span, SpanStatusCode, context } from '@opentelemetry/api';
import { z } from 'zod';

/** Tracing configuration schema */
export const TracingConfigSchema = z.object({
  serviceName: z.string().min(1).default('aasop'),
  serviceVersion: z.string().default('0.1.0'),
  environment: z.string().default('development'),
  otlpEndpoint: z.string().default('http://localhost:4317'),
  samplingRatio: z.number().min(0).max(1).default(1),
  enableAutoInstrumentation: z.boolean().default(true),
  enabled: z.boolean().default(true),
});

export type TracingConfig = z.infer<typeof TracingConfigSchema>;

// ==================== Global SDK ====================

let sdk: NodeSDK | null = null;

/** Initialize the OpenTelemetry SDK */
export function initTracing(config?: Partial<TracingConfig>): NodeSDK {
  const cfg = TracingConfigSchema.parse({ ...config });

  if (!cfg.enabled) {
    return null as unknown as NodeSDK;
  }

  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: cfg.serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: cfg.serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: cfg.environment,
  });

  const traceExporter = new OTLPTraceExporter({
    url: cfg.otlpEndpoint,
  });

  const metricExporter = new OTLPMetricExporter({
    url: cfg.otlpEndpoint,
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 15000,
    }),
    instrumentations: cfg.enableAutoInstrumentation
      ? [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-http': { enabled: true },
            '@opentelemetry/instrumentation-pg': { enabled: true },
            '@opentelemetry/instrumentation-redis': { enabled: true },
            '@opentelemetry/instrumentation-fs': { enabled: false },
          }),
        ]
      : [],
  });

  sdk.start();
  return sdk;
}

/** Shutdown the OpenTelemetry SDK */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}

// ==================== Tracer Helpers ====================

/** Get or create a named tracer */
export function getTracer(name: string, version = '1.0.0'): Tracer {
  return trace.getTracer(name, version);
}

/** Default tracer for the AASOP service */
export function getDefaultTracer(): Tracer {
  return getTracer('aasop', '0.1.0');
}

/** Wrap a function in a span */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options?: {
    attributes?: Record<string, string | number | boolean>;
    kind?: number;
    parent?: Span;
  },
): Promise<T> {
  const tracer = getDefaultTracer();
  return tracer.startActiveSpan(name, { attributes: options?.attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/** Wrap a synchronous function in a span */
export function withSpanSync<T>(
  name: string,
  fn: (span: Span) => T,
  options?: {
    attributes?: Record<string, string | number | boolean>;
  },
): T {
  const tracer = getDefaultTracer();
  return tracer.startActiveSpan(name, { attributes: options?.attributes }, (span) => {
    try {
      const result = fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/** Create a child span */
export function createSpan(
  name: string,
  parentSpan: Span,
  attributes?: Record<string, string | number | boolean>,
): Span {
  const tracer = getDefaultTracer();
  const ctx = trace.setSpan(context.active(), parentSpan);
  const span = tracer.startSpan(name, { attributes }, ctx);
  return span;
}

/** Add attributes to current span */
export function setSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/** Record an error on the current span */
export function recordSpanError(error: Error): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  }
}

/** Create a span from context for async operations */
export function getSpanFromContext(): Span | undefined {
  return trace.getActiveSpan();
}

// ==================== Trace Context Propagation ====================

/** Extract trace context from headers */
export function extractTraceContext(headers: Record<string, string>): unknown {
  // W3C trace context propagation
  const traceparent = headers['traceparent'];
  const tracestate = headers['tracestate'];

  if (!traceparent) return null;

  return {
    traceparent,
    tracestate,
  };
}

/** Inject trace context into headers */
export function injectTraceContext(headers: Record<string, string>): Record<string, string> {
  const propagator = trace.getSpan(context.active());
  if (!propagator) return headers;

  // The propagator would add traceparent/tracestate headers
  // In practice, use the W3C propagator from @opentelemetry/core
  return {
    ...headers,
    traceparent: `00-${propagator.spanContext().traceId}-${propagator.spanContext().spanId}-01`,
  };
}

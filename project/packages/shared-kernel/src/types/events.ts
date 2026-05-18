/**
 * CloudEvents-compatible event types.
 * All inter-service communication uses CloudEvents format.
 */

import { randomUUID } from 'node:crypto';

export enum EventType {
  // Agent events
  AGENT_CREATED = 'aasop.agent.created',
  AGENT_UPDATED = 'aasop.agent.updated',
  AGENT_STATE_CHANGED = 'aasop.agent.state.changed',
  AGENT_DELETED = 'aasop.agent.deleted',

  // Task events
  TASK_CREATED = 'aasop.task.created',
  TASK_UPDATED = 'aasop.task.updated',
  TASK_ASSIGNED = 'aasop.task.assigned',
  TASK_COMPLETED = 'aasop.task.completed',
  TASK_FAILED = 'aasop.task.failed',

  // Workflow events
  WORKFLOW_STARTED = 'aasop.workflow.started',
  WORKFLOW_STEP_COMPLETED = 'aasop.workflow.step.completed',
  WORKFLOW_COMPLETED = 'aasop.workflow.completed',
  WORKFLOW_FAILED = 'aasop.workflow.failed',

  // Project events
  PROJECT_CREATED = 'aasop.project.created',
  PROJECT_UPDATED = 'aasop.project.updated',
  PROJECT_ARCHIVED = 'aasop.project.archived',

  // User events
  USER_JOINED = 'aasop.user.joined',
  USER_LEFT = 'aasop.user.left',

  // Sandbox events
  SANDBOX_CREATED = 'aasop.sandbox.created',
  SANDBOX_STARTED = 'aasop.sandbox.started',
  SANDBOX_DESTROYED = 'aasop.sandbox.destroyed',

  // Memory events
  MEMORY_CREATED = 'aasop.memory.created',
  MEMORY_ACCESSED = 'aasop.memory.accessed',

  // Inference events
  INFERENCE_COMPLETED = 'aasop.inference.completed',
  INFERENCE_FAILED = 'aasop.inference.failed',
}

/** CloudEvents specification v1.0 compatible event */
export interface CloudEvent<T = unknown> {
  specversion: '1.0';
  type: EventType;
  source: string;
  id: string;
  time: Date;
  datacontenttype: 'application/json';
  dataschema?: string;
  subject?: string;
  data: T;
  extensions?: Record<string, unknown>;
}

/** Event metadata for routing and filtering */
export interface EventMetadata {
  traceId: string;
  spanId: string;
  orgId: string;
  projectId?: string;
  userId?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  retryCount: number;
}

/** Event envelope wrapping CloudEvent with metadata */
export interface EventEnvelope<T = unknown> {
  event: CloudEvent<T>;
  metadata: EventMetadata;
  signature: string | null;
  publishedAt: Date;
  deliveredAt: Date | null;
}

/** Event subscription configuration */
export interface EventSubscription {
  id: string;
  name: string;
  eventTypes: EventType[];
  sourceFilter?: string;
  subjectFilter?: string;
  orgFilter?: string;
  handler: string;
  queueName: string;
  maxRetries: number;
  deadLetterQueue: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Event handler result */
export interface EventHandlerResult {
  success: boolean;
  action: 'ack' | 'retry' | 'dlq';
  processedAt: Date;
  durationMs: number;
  error: string | null;
}

/** Create CloudEvent factory function */
export function createCloudEvent<T>(
  type: EventType,
  source: string,
  data: T,
  options?: {
    id?: string;
    subject?: string;
    dataschema?: string;
    extensions?: Record<string, unknown>;
  },
): CloudEvent<T> {
  const event: CloudEvent<T> = {
    specversion: '1.0',
    type,
    source,
    id: options?.id ?? randomUUID(),
    time: new Date(),
    datacontenttype: 'application/json',
    data,
  };

  if (options?.dataschema !== undefined) event.dataschema = options.dataschema;
  if (options?.subject !== undefined) event.subject = options.subject;
  if (options?.extensions !== undefined) event.extensions = options.extensions;

  return event;
}

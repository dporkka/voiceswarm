import { EventEmitter } from 'events';
import { createLogger } from '@aasop/observability';

const logger = createLogger('agent-communicator');

export interface AgentMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'broadcast' | 'event';
  payload: Record<string, unknown>;
  timestamp: Date;
  correlationId?: string;
}

export class AgentCommunicator extends EventEmitter {
  private messageQueue = new Map<string, AgentMessage[]>();
  private subscriptions = new Map<string, Set<(msg: AgentMessage) => void>>();

  async sendMessage(from: string, to: string, payload: Record<string, unknown>, type: AgentMessage['type'] = 'request'): Promise<void> {
    const message: AgentMessage = {
      from,
      to,
      type,
      payload,
      timestamp: new Date(),
      correlationId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };

    const queue = this.messageQueue.get(to) || [];
    queue.push(message);
    this.messageQueue.set(to, queue);

    const subscribers = this.subscriptions.get(to);
    if (subscribers) {
      for (const handler of subscribers) {
        try { handler(message); } catch (err) { logger.error({ err }, 'Message handler error'); }
      }
    }

    this.emit('message', message);
    logger.debug({ from, to, type, correlationId: message.correlationId }, 'Message sent');
  }

  async broadcast(from: string, payload: Record<string, unknown>): Promise<void> {
    const message: AgentMessage = {
      from,
      to: 'all',
      type: 'broadcast',
      payload,
      timestamp: new Date(),
      correlationId: `broadcast_${Date.now()}`,
    };

    this.emit('broadcast', message);

    for (const [agentId, subscribers] of this.subscriptions) {
      if (agentId !== from) {
        for (const handler of subscribers) {
          try { handler(message); } catch (err) { logger.error({ err }, 'Broadcast handler error'); }
        }
      }
    }

    logger.debug({ from }, 'Broadcast sent');
  }

  subscribe(agentId: string, handler: (msg: AgentMessage) => void): () => void {
    const subscribers = this.subscriptions.get(agentId) || new Set();
    subscribers.add(handler);
    this.subscriptions.set(agentId, subscribers);

    return () => {
      subscribers.delete(handler);
      if (subscribers.size === 0) {
        this.subscriptions.delete(agentId);
      }
    };
  }

  getMessages(agentId: string): AgentMessage[] {
    return this.messageQueue.get(agentId) || [];
  }

  async request(from: string, to: string, payload: Record<string, unknown>, timeoutMs = 30000): Promise<AgentMessage> {
    const correlationId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const message: AgentMessage = {
      from,
      to,
      type: 'request',
      payload,
      timestamp: new Date(),
      correlationId,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const unsubscribe = this.subscribe(to, (msg) => {
        if (msg.correlationId === correlationId && msg.type === 'response') {
          clearTimeout(timeout);
          unsubscribe();
          resolve(msg);
        }
      });

      const queue = this.messageQueue.get(to) || [];
      queue.push(message);
      this.messageQueue.set(to, queue);
    });
  }

  clearQueue(agentId: string): void {
    this.messageQueue.delete(agentId);
  }
}

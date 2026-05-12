import { QdrantClient } from '@qdrant/qdrant-js';
import { createLogger } from '@aasop/observability';
import type { MemoryEntry } from './service.js';

const logger = createLogger('project-memory');

export class ProjectMemory {
  private client: QdrantClient;
  private collection: string;

  constructor(opts: { url: string; collection?: string; apiKey?: string }) {
    this.client = new QdrantClient({ url: opts.url, apiKey: opts.apiKey });
    this.collection = opts.collection || 'project-memory';
  }

  async initialize(dimension = 1536): Promise<void> {
    try {
      await this.client.getCollection(this.collection);
      logger.info({ collection: this.collection }, 'Project memory collection exists');
    } catch {
      await this.client.createCollection(this.collection, {
        vectors: {
          size: dimension,
          distance: 'Cosine',
        },
      });
      logger.info({ collection: this.collection, dimension }, 'Created project memory collection');
    }
  }

  async store(entry: MemoryEntry): Promise<void> {
    if (!entry.projectId) {
      logger.warn({ id: entry.id }, 'Project memory entry missing projectId');
      return;
    }

    const vector = entry.embedding || new Array(1536).fill(0);

    await this.client.upsert(this.collection, {
      points: [
        {
          id: entry.id,
          vector,
          payload: {
            content: entry.content,
            type: entry.type,
            projectId: entry.projectId,
            agentId: entry.agentId,
            taskId: entry.taskId,
            metadata: entry.metadata,
            timestamp: entry.timestamp.toISOString(),
            importance: entry.importance ?? 1.0,
            tags: entry.tags ?? [],
          },
        },
      ],
    });

    logger.debug({ id: entry.id, projectId: entry.projectId }, 'Stored project memory');
  }

  async getByProject(projectId: string, limit = 20): Promise<MemoryEntry[]> {
    const results = await this.client.scroll(this.collection, {
      limit,
      filter: {
        must: [{ key: 'projectId', match: { value: projectId } }],
      },
      with_payload: true,
    });

    return results.points.map((p) => this.payloadToEntry(p.id.toString(), p.payload));
  }

  async searchByEmbedding(projectId: string, vector: number[], topK = 5): Promise<MemoryEntry[]> {
    const results = await this.client.search(this.collection, {
      vector,
      limit: topK,
      filter: {
        must: [{ key: 'projectId', match: { value: projectId } }],
      },
      with_payload: true,
    });

    return results.map((r) => this.payloadToEntry(r.id.toString(), r.payload));
  }

  async getById(id: string): Promise<MemoryEntry | null> {
    try {
      const result = await this.client.retrieve(this.collection, { ids: [id], with_payload: true });
      if (!result[0]) return null;
      return this.payloadToEntry(id, result[0].payload);
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(this.collection, { points: [id] });
    logger.debug({ id }, 'Deleted project memory');
  }

  async count(): Promise<{ count: number }> {
    const result = await this.client.count(this.collection);
    return { count: result.count };
  }

  private payloadToEntry(id: string, payload: Record<string, unknown> | null): MemoryEntry {
    return {
      id,
      content: (payload?.content as string) || '',
      type: (payload?.type as MemoryEntry['type']) || 'fact',
      metadata: (payload?.metadata as Record<string, unknown>) || {},
      projectId: payload?.projectId as string | undefined,
      agentId: payload?.agentId as string | undefined,
      taskId: payload?.taskId as string | undefined,
      timestamp: payload?.timestamp ? new Date(payload.timestamp as string) : new Date(),
      importance: payload?.importance as number | undefined,
      tags: payload?.tags as string[] | undefined,
    };
  }
}

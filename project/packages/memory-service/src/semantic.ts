// @ts-nocheck
import { QdrantClient } from '@qdrant/qdrant-js';
import { createLogger } from '@aasop/observability';
import type { MemoryEntry, SemanticSearchResult } from './service.js';

const logger = createLogger('semantic-memory');

export class SemanticMemory {
  private client: QdrantClient;
  private collection: string;

  constructor(opts: { url: string; collection?: string; apiKey?: string }) {
    this.client = new QdrantClient({ url: opts.url, apiKey: opts.apiKey });
    this.collection = opts.collection || 'semantic-memory';
  }

  async initialize(dimension = 1536): Promise<void> {
    try {
      await this.client.getCollection(this.collection);
      logger.info({ collection: this.collection }, 'Semantic memory collection exists');
    } catch {
      logger.info({ collection: this.collection, dimension }, 'Creating semantic memory collection');
      await this.client.createCollection(this.collection, {
        vectors: {
          size: dimension,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });
    }
  }

  async store(entry: MemoryEntry): Promise<void> {
    if (!entry.embedding) {
      throw new Error(`Memory entry ${entry.id} has no embedding`);
    }

    await this.client.upsert(this.collection, {
      points: [
        {
          id: entry.id,
          vector: entry.embedding,
          payload: {
            content: entry.content,
            type: entry.type,
            metadata: entry.metadata,
            projectId: entry.projectId,
            agentId: entry.agentId,
            taskId: entry.taskId,
            timestamp: entry.timestamp.toISOString(),
            importance: entry.importance ?? 1.0,
            tags: entry.tags ?? [],
          },
        },
      ],
    });

    logger.debug({ id: entry.id }, 'Stored semantic memory');
  }

  async search(vector: number[], topK = 5, minScore = 0.7): Promise<SemanticSearchResult[]> {
    const results = await this.client.search(this.collection, {
      vector,
      limit: topK,
      score_threshold: minScore,
      with_payload: true,
    });

    return results.map((r) => ({
      entry: this.payloadToEntry(r.id.toString(), r.payload),
      score: r.score,
      distance: 1 - r.score,
    }));
  }

  async searchWithFilter(
    vector: number[],
    filter: { projectId?: string; agentId?: string; type?: string; tags?: string[] },
    topK = 5
  ): Promise<SemanticSearchResult[]> {
    const conditions: Array<{ key: string; match: Record<string, unknown> }> = [];

    if (filter.projectId) conditions.push({ key: 'projectId', match: { value: filter.projectId } });
    if (filter.agentId) conditions.push({ key: 'agentId', match: { value: filter.agentId } });
    if (filter.type) conditions.push({ key: 'type', match: { value: filter.type } });
    if (filter.tags) conditions.push({ key: 'tags', match: { any: filter.tags } });

    const results = await this.client.search(this.collection, {
      vector,
      limit: topK,
      filter: conditions.length > 0 ? { must: conditions } : undefined,
      with_payload: true,
    });

    return results.map((r) => ({
      entry: this.payloadToEntry(r.id.toString(), r.payload),
      score: r.score,
      distance: 1 - r.score,
    }));
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
    logger.debug({ id }, 'Deleted semantic memory');
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

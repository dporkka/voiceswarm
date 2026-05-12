/**
 * Qdrant vector database client wrapper.
 * Used for semantic memory search.
 */

import { QdrantClient } from '@qdrant/js-client-rest';

/** Vector search result */
export interface VectorSearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
  vector: number[] | null;
}

/** Qdrant collection configuration */
export interface CollectionConfig {
  name: string;
  vectorSize: number;
  distance: 'Cosine' | 'Euclidean' | 'Dot';
  onDisk?: boolean;
}

/** Qdrant client wrapper */
export class QdrantClientWrapper {
  private readonly client: QdrantClient;

  constructor(options?: { url?: string; apiKey?: string }) {
    this.client = new QdrantClient({
      url: options?.url ?? process.env.QDRANT_URL ?? 'http://localhost:6333',
      apiKey: options?.apiKey,
    });
  }

  /** Get the raw Qdrant client */
  getClient(): QdrantClient {
    return this.client;
  }

  // ==================== Collection Management ====================

  /** Create a new collection */
  async createCollection(config: CollectionConfig): Promise<void> {
    await this.client.createCollection(config.name, {
      vectors: {
        size: config.vectorSize,
        distance: config.distance,
        on_disk: config.onDisk ?? true,
      },
    });
  }

  /** Delete a collection */
  async deleteCollection(name: string): Promise<void> {
    await this.client.deleteCollection(name);
  }

  /** Check if collection exists */
  async collectionExists(name: string): Promise<boolean> {
    try {
      const result = await this.client.collectionExists(name);
      return result.exists;
    } catch {
      return false;
    }
  }

  /** Get collection info */
  async getCollectionInfo(name: string): Promise<unknown> {
    return this.client.getCollection(name);
  }

  /** List all collections */
  async listCollections(): Promise<string[]> {
    const result = await this.client.getCollections();
    return result.collections.map((c) => c.name);
  }

  // ==================== Points Operations ====================

  /** Upsert a single vector point */
  async upsert(
    collectionName: string,
    id: string,
    vector: number[],
    payload?: Record<string, unknown>,
  ): Promise<void> {
    await this.client.upsert(collectionName, {
      points: [
        {
          id,
          vector,
          payload,
        },
      ],
    });
  }

  /** Upsert multiple points */
  async upsertBatch(
    collectionName: string,
    points: Array<{
      id: string;
      vector: number[];
      payload?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    await this.client.upsert(collectionName, {
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });
  }

  /** Search for similar vectors */
  async search(
    collectionName: string,
    vector: number[],
    options?: {
      limit?: number;
      filter?: Record<string, unknown>;
      scoreThreshold?: number;
      offset?: number;
    },
  ): Promise<VectorSearchResult[]> {
    const results = await this.client.search(collectionName, {
      vector,
      limit: options?.limit ?? 10,
      offset: options?.offset ?? 0,
      filter: options?.filter,
      score_threshold: options?.scoreThreshold,
      with_vector: true,
      with_payload: true,
    });

    return results.map((r) => ({
      id: String(r.id),
      score: r.score,
      payload: (r.payload as Record<string, unknown>) ?? {},
      vector: r.vector as number[] | null,
    }));
  }

  /** Get a point by ID */
  async getPoint(collectionName: string, id: string): Promise<VectorSearchResult | null> {
    const result = await this.client.retrieve(collectionName, [id], {
      with_vector: true,
      with_payload: true,
    });

    if (result.length === 0) return null;

    const point = result[0];
    return {
      id: String(point.id),
      score: 1,
      payload: (point.payload as Record<string, unknown>) ?? {},
      vector: point.vector as number[] | null,
    };
  }

  /** Delete a point by ID */
  async deletePoint(collectionName: string, id: string): Promise<void> {
    await this.client.delete(collectionName, {
      points: [id],
    });
  }

  /** Delete points matching filter */
  async deleteByFilter(collectionName: string, filter: Record<string, unknown>): Promise<void> {
    await this.client.delete(collectionName, {
      filter,
    });
  }

  // ==================== Memory-specific helpers ====================

  /** Search semantic memory for an agent/project */
  async searchSemanticMemory(
    embedding: number[],
    options: {
      agentId?: string;
      projectId?: string;
      orgId?: string;
      limit?: number;
      scoreThreshold?: number;
    } = {},
  ): Promise<VectorSearchResult[]> {
    const filter: Record<string, unknown> = {};
    const must: Array<Record<string, unknown>> = [];

    if (options.agentId) {
      must.push({ key: 'agentId', match: { value: options.agentId } });
    }
    if (options.projectId) {
      must.push({ key: 'projectId', match: { value: options.projectId } });
    }
    if (options.orgId) {
      must.push({ key: 'orgId', match: { value: options.orgId } });
    }

    if (must.length > 0) {
      filter.must = must;
    }

    return this.search('semantic_memory', embedding, {
      limit: options.limit ?? 10,
      scoreThreshold: options.scoreThreshold ?? 0.7,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });
  }

  /** Initialize default collections */
  async initializeCollections(): Promise<void> {
    const collections = ['semantic_memory', 'episodic_memory', 'procedural_memory'];

    for (const name of collections) {
      const exists = await this.collectionExists(name);
      if (!exists) {
        await this.createCollection({
          name,
          vectorSize: 1536,
          distance: 'Cosine',
        });
      }
    }
  }
}

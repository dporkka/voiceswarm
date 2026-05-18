// @ts-nocheck
/**
 * Memory repository for PostgreSQL (metadata + Qdrant for embeddings).
 */

import type { Kysely, Selectable } from 'kysely';
import type { Database } from '../schema.js';
import { BaseRepository } from './base.js';

export type MemoryEntryRow = Selectable<Database['memoryEntries']>;

export class MemoryRepository extends BaseRepository<'memoryEntries'> {
  constructor(db: Kysely<Database>) {
    super(db, 'memoryEntries');
  }

  /** Find memory entries by agent */
  async findByAgentId(agentId: string, options?: { offset?: number; limit?: number }): Promise<MemoryEntryRow[]> {
    return this.db
      .selectFrom('memoryEntries')
      .selectAll()
      .where('agentId', '=', agentId)
      .offset(options?.offset ?? 0)
      .limit(options?.limit ?? 100)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  /** Find memory entries by project */
  async findByProjectId(projectId: string, type?: string): Promise<MemoryEntryRow[]> {
    let query = this.db
      .selectFrom('memoryEntries')
      .selectAll()
      .where('projectId', '=', projectId);

    if (type) query = query.where('type', '=', type);

    return query.orderBy('createdAt', 'desc').execute();
  }

  /** Find memories by type */
  async findByType(type: string, options?: { agentId?: string; projectId?: string; limit?: number }): Promise<MemoryEntryRow[]> {
    let query = this.db
      .selectFrom('memoryEntries')
      .selectAll()
      .where('type', '=', type);

    if (options?.agentId) query = query.where('agentId', '=', options.agentId);
    if (options?.projectId) query = query.where('projectId', '=', options.projectId);

    return query.limit(options?.limit ?? 100).execute();
  }

  /** Update access count and last accessed timestamp */
  async touch(id: string): Promise<void> {
    await this.db
      .updateTable('memoryEntries')
      .set((eb) => ({
        accessCount: eb('accessCount', '+', 1),
        lastAccessedAt: new Date(),
        updatedAt: new Date(),
      }))
      .where('id', '=', id)
      .execute();
  }

  /** Find memories by tags */
  async findByTags(tags: string[]): Promise<MemoryEntryRow[]> {
    return this.db
      .selectFrom('memoryEntries')
      .selectAll()
      .where('tags', '&&', tags)
      .execute();
  }

  /** Search memory by content */
  async search(query: string, options?: { agentId?: string; projectId?: string; limit?: number }): Promise<MemoryEntryRow[]> {
    let qb = this.db
      .selectFrom('memoryEntries')
      .selectAll()
      .where('content', 'ilike', `%${query}%`);

    if (options?.agentId) qb = qb.where('agentId', '=', options.agentId);
    if (options?.projectId) qb = qb.where('projectId', '=', options.projectId);

    return qb.limit(options?.limit ?? 50).execute();
  }

  /** Update embedding for a memory entry */
  async updateEmbedding(id: string, embedding: number[]): Promise<void> {
    await this.db
      .updateTable('memoryEntries')
      .set({ embedding, updatedAt: new Date() })
      .where('id', '=', id)
      .execute();
  }

  /** Find stale memories that haven't been accessed recently */
  async findStale(before: Date, limit = 1000): Promise<MemoryEntryRow[]> {
    return this.db
      .selectFrom('memoryEntries')
      .selectAll()
      .where('lastAccessedAt', '<', before)
      .limit(limit)
      .execute();
  }
}

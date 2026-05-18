// @ts-nocheck
/**
 * Agent repository for PostgreSQL.
 */

import type { Kysely, Selectable, Insertable, Updateable } from 'kysely';
import type { Database } from '../schema.js';
import { BaseRepository } from './base.js';

export type AgentRow = Selectable<Database['agents']>;
export type AgentInsert = Insertable<Database['agents']>;
export type AgentUpdate = Updateable<Database['agents']>;

export class AgentRepository extends BaseRepository<'agents'> {
  constructor(db: Kysely<Database>) {
    super(db, 'agents');
  }

  /** Find agents by project */
  async findByProjectId(projectId: string): Promise<AgentRow[]> {
    return this.db
      .selectFrom('agents')
      .selectAll()
      .where('projectId', '=', projectId)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  /** Find agents by organization */
  async findByOrgId(orgId: string, options?: { offset?: number; limit?: number; state?: string }): Promise<AgentRow[]> {
    let query = this.db
      .selectFrom('agents')
      .selectAll()
      .where('orgId', '=', orgId);

    if (options?.state) query = query.where('state', '=', options.state);

    return query
      .offset(options?.offset ?? 0)
      .limit(options?.limit ?? 100)
      .orderBy('updatedAt', 'desc')
      .execute();
  }

  /** Find agents by state */
  async findByState(state: string): Promise<AgentRow[]> {
    return this.db
      .selectFrom('agents')
      .selectAll()
      .where('state', '=', state)
      .execute();
  }

  /** Find idle agents available for assignment */
  async findIdleAgents(projectId?: string): Promise<AgentRow[]> {
    let query = this.db
      .selectFrom('agents')
      .selectAll()
      .where('state', '=', 'idle');

    if (projectId) {
      query = query.where('projectId', '=', projectId);
    }

    return query.execute();
  }

  /** Update agent state */
  async updateState(id: string, state: string): Promise<AgentRow | undefined> {
    return this.db
      .updateTable('agents')
      .set({ state, updatedAt: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /** Update agent metrics */
  async updateMetrics(id: string, metrics: unknown): Promise<AgentRow | undefined> {
    return this.db
      .updateTable('agents')
      .set({ metrics, updatedAt: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /** Count agents by project */
  async countByProjectId(projectId: string): Promise<number> {
    const result = await this.db
      .selectFrom('agents')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('projectId', '=', projectId)
      .executeTakeFirst();

    return Number(result?.count ?? 0);
  }
}

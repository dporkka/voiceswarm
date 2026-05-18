// @ts-nocheck
/**
 * Project repository for PostgreSQL.
 */

import type { Kysely, Selectable } from 'kysely';
import type { Database } from '../schema.js';
import { BaseRepository } from './base.js';

export type ProjectRow = Selectable<Database['projects']>;

export class ProjectRepository extends BaseRepository<'projects'> {
  constructor(db: Kysely<Database>) {
    super(db, 'projects');
  }

  /** Find projects by organization */
  async findByOrgId(orgId: string, options?: { offset?: number; limit?: number; status?: string }): Promise<ProjectRow[]> {
    let query = this.db
      .selectFrom('projects')
      .selectAll()
      .where('orgId', '=', orgId);

    if (options?.status) query = query.where('status', '=', options.status);

    return query
      .offset(options?.offset ?? 0)
      .limit(options?.limit ?? 100)
      .orderBy('updatedAt', 'desc')
      .execute();
  }

  /** Find projects by owner */
  async findByOwnerId(ownerId: string): Promise<ProjectRow[]> {
    return this.db
      .selectFrom('projects')
      .selectAll()
      .where('ownerId', '=', ownerId)
      .orderBy('updatedAt', 'desc')
      .execute();
  }

  /** Find projects where user is a member */
  async findByMemberId(userId: string): Promise<ProjectRow[]> {
    return this.db
      .selectFrom('projects')
      .selectAll()
      .innerJoin('projectMembers', 'projectMembers.projectId', 'projects.id')
      .where('projectMembers.userId', '=', userId)
      .execute();
  }

  /** Update project status */
  async updateStatus(id: string, status: string): Promise<ProjectRow | undefined> {
    return this.db
      .updateTable('projects')
      .set({ status, updatedAt: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /** Search projects by name */
  async search(orgId: string, query: string, limit = 20): Promise<ProjectRow[]> {
    return this.db
      .selectFrom('projects')
      .selectAll()
      .where('orgId', '=', orgId)
      .where((eb) =>
        eb.or([
          eb('name', 'ilike', `%${query}%`),
          eb('description', 'ilike', `%${query}%`),
        ]),
      )
      .limit(limit)
      .execute();
  }

  /** Count projects in an organization */
  async countByOrgId(orgId: string): Promise<number> {
    const result = await this.db
      .selectFrom('projects')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('orgId', '=', orgId)
      .executeTakeFirst();

    return Number(result?.count ?? 0);
  }
}

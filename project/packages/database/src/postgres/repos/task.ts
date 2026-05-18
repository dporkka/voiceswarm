// @ts-nocheck
/**
 * Task repository for PostgreSQL.
 */

import type { Kysely, Selectable, Insertable, Updateable } from 'kysely';
import type { Database } from '../schema.js';
import { BaseRepository } from './base.js';

export type TaskRow = Selectable<Database['tasks']>;
export type TaskInsert = Insertable<Database['tasks']>;
export type TaskUpdate = Updateable<Database['tasks']>;

export class TaskRepository extends BaseRepository<'tasks'> {
  constructor(db: Kysely<Database>) {
    super(db, 'tasks');
  }

  /** Find tasks by project */
  async findByProjectId(projectId: string, options?: { offset?: number; limit?: number }): Promise<TaskRow[]> {
    return this.db
      .selectFrom('tasks')
      .selectAll()
      .where('projectId', '=', projectId)
      .offset(options?.offset ?? 0)
      .limit(options?.limit ?? 100)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  /** Find tasks by assignee */
  async findByAssigneeId(assigneeId: string): Promise<TaskRow[]> {
    return this.db
      .selectFrom('tasks')
      .selectAll()
      .where('assigneeId', '=', assigneeId)
      .orderBy('updatedAt', 'desc')
      .execute();
  }

  /** Find tasks by status */
  async findByStatus(status: string, projectId?: string): Promise<TaskRow[]> {
    let query = this.db
      .selectFrom('tasks')
      .selectAll()
      .where('status', '=', status);

    if (projectId) query = query.where('projectId', '=', projectId);

    return query.execute();
  }

  /** Find tasks by workflow */
  async findByWorkflowId(workflowId: string): Promise<TaskRow[]> {
    return this.db
      .selectFrom('tasks')
      .selectAll()
      .where('workflowId', '=', workflowId)
      .execute();
  }

  /** Find subtasks of a parent task */
  async findSubtasks(parentTaskId: string): Promise<TaskRow[]> {
    return this.db
      .selectFrom('tasks')
      .selectAll()
      .where('parentTaskId', '=', parentTaskId)
      .execute();
  }

  /** Update task status */
  async updateStatus(id: string, status: string, completedAt?: Date): Promise<TaskRow | undefined> {
    const updates: Record<string, unknown> = { status, updatedAt: new Date() };
    if (completedAt) updates.completedAt = completedAt;

    return this.db
      .updateTable('tasks')
      .set(updates as never)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /** Assign task to an agent */
  async assign(id: string, assigneeId: string): Promise<TaskRow | undefined> {
    return this.db
      .updateTable('tasks')
      .set({ assigneeId, status: 'assigned', updatedAt: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /** Find pending tasks ready for assignment */
  async findPendingTasks(projectId?: string, limit = 50): Promise<TaskRow[]> {
    let query = this.db
      .selectFrom('tasks')
      .selectAll()
      .where('status', '=', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(limit);

    if (projectId) query = query.where('projectId', '=', projectId);

    return query.execute();
  }

  /** Count tasks by status for a project */
  async countByStatus(projectId: string): Promise<Record<string, number>> {
    const results = await this.db
      .selectFrom('tasks')
      .select(['status', (eb) => eb.fn.countAll().as('count')])
      .where('projectId', '=', projectId)
      .groupBy('status')
      .execute();

    return Object.fromEntries(results.map((r) => [r.status, Number(r.count)]));
  }

  /** Search tasks by title or tags */
  async search(projectId: string, query: string): Promise<TaskRow[]> {
    return this.db
      .selectFrom('tasks')
      .selectAll()
      .where('projectId', '=', projectId)
      .where((eb) =>
        eb.or([
          eb('title', 'ilike', `%${query}%`),
          eb('description', 'ilike', `%${query}%`),
        ]),
      )
      .execute();
  }
}

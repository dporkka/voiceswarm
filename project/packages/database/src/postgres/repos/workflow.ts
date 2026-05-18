// @ts-nocheck
/**
 * Workflow repository for PostgreSQL.
 */

import type { Kysely, Selectable } from 'kysely';
import type { Database } from '../schema.js';
import { BaseRepository } from './base.js';

export type WorkflowDefinitionRow = Selectable<Database['workflowDefinitions']>;
export type WorkflowInstanceRow = Selectable<Database['workflowInstances']>;

export class WorkflowDefinitionRepository extends BaseRepository<'workflowDefinitions'> {
  constructor(db: Kysely<Database>) {
    super(db, 'workflowDefinitions');
  }

  /** Find definitions by organization */
  async findByOrgId(orgId: string): Promise<WorkflowDefinitionRow[]> {
    return this.db
      .selectFrom('workflowDefinitions')
      .selectAll()
      .where('orgId', '=', orgId)
      .orderBy('updatedAt', 'desc')
      .execute();
  }

  /** Find definitions by trigger type */
  async findByTrigger(trigger: string): Promise<WorkflowDefinitionRow[]> {
    return this.db
      .selectFrom('workflowDefinitions')
      .selectAll()
      .where('trigger', '=', trigger)
      .execute();
  }

  /** Find latest version of a definition by name */
  async findLatestByName(name: string, orgId: string): Promise<WorkflowDefinitionRow | undefined> {
    return this.db
      .selectFrom('workflowDefinitions')
      .selectAll()
      .where('name', '=', name)
      .where('orgId', '=', orgId)
      .orderBy('createdAt', 'desc')
      .executeTakeFirst();
  }
}

export class WorkflowInstanceRepository extends BaseRepository<'workflowInstances'> {
  constructor(db: Kysely<Database>) {
    super(db, 'workflowInstances');
  }

  /** Find instances by definition */
  async findByDefinitionId(definitionId: string): Promise<WorkflowInstanceRow[]> {
    return this.db
      .selectFrom('workflowInstances')
      .selectAll()
      .where('definitionId', '=', definitionId)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  /** Find instances by project */
  async findByProjectId(projectId: string): Promise<WorkflowInstanceRow[]> {
    return this.db
      .selectFrom('workflowInstances')
      .selectAll()
      .where('projectId', '=', projectId)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  /** Find instances by status */
  async findByStatus(status: string): Promise<WorkflowInstanceRow[]> {
    return this.db
      .selectFrom('workflowInstances')
      .selectAll()
      .where('status', '=', status)
      .execute();
  }

  /** Find running instances that may have timed out */
  async findPotentiallyTimedOut(threshold: Date): Promise<WorkflowInstanceRow[]> {
    return this.db
      .selectFrom('workflowInstances')
      .selectAll()
      .where('status', 'in', ['running', 'waiting'])
      .where('updatedAt', '<', threshold)
      .execute();
  }

  /** Update instance status and current step */
  async updateStatus(id: string, status: string, currentStepId?: string): Promise<WorkflowInstanceRow | undefined> {
    const updates: Record<string, unknown> = { status, updatedAt: new Date() };
    if (currentStepId !== undefined) updates.currentStepId = currentStepId;
    if (status === 'completed' || status === 'failed' || status === 'timed_out' || status === 'cancelled') {
      updates.completedAt = new Date();
    }

    return this.db
      .updateTable('workflowInstances')
      .set(updates as never)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /** Update step results */
  async updateStepResults(id: string, stepResults: unknown): Promise<WorkflowInstanceRow | undefined> {
    return this.db
      .updateTable('workflowInstances')
      .set({ stepResults, updatedAt: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }
}

import { Kysely, sql } from 'kysely';
import type { DB } from '@aasop/shared-kernel';
import { createLogger } from '@aasop/observability';
import type { MemoryEntry, EpisodicQuery } from './service.js';

const logger = createLogger('episodic-memory');

export class EpisodicMemory {
  constructor(private db: Kysely<DB>) {}

  async initialize(): Promise<void> {
    await this.db.schema
      .createTable('episodic_memories')
      .ifNotExists()
      .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('type', 'varchar(32)', (col) => col.notNull().defaultTo('observation'))
      .addColumn('agent_id', 'varchar(36)')
      .addColumn('task_id', 'varchar(36)')
      .addColumn('project_id', 'varchar(36)')
      .addColumn('metadata', 'jsonb')
      .addColumn('importance', 'decimal(3,2)')
      .addColumn('tags', 'jsonb')
      .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
      .execute();

    await this.db.schema
      .createIndex('idx_episodic_agent')
      .ifNotExists()
      .on('episodic_memories')
      .column('agent_id')
      .execute();

    await this.db.schema
      .createIndex('idx_episodic_task')
      .ifNotExists()
      .on('episodic_memories')
      .column('task_id')
      .execute();

    await this.db.schema
      .createIndex('idx_episodic_project')
      .ifNotExists()
      .on('episodic_memories')
      .column('project_id')
      .execute();

    await this.db.schema
      .createIndex('idx_episodic_created')
      .ifNotExists()
      .on('episodic_memories')
      .column('created_at')
      .execute();

    logger.info('Episodic memory tables initialized');
  }

  async store(entry: MemoryEntry): Promise<void> {
    await this.db
      .insertInto('episodic_memories')
      .values({
        id: entry.id,
        content: entry.content,
        type: entry.type,
        agent_id: entry.agentId,
        task_id: entry.taskId,
        project_id: entry.projectId,
        metadata: JSON.stringify(entry.metadata) as any,
        importance: entry.importance ?? 1.0,
        tags: JSON.stringify(entry.tags ?? []) as any,
        created_at: entry.timestamp,
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          content: entry.content,
          metadata: JSON.stringify(entry.metadata) as any,
          importance: entry.importance ?? 1.0,
          tags: JSON.stringify(entry.tags ?? []) as any,
        })
      )
      .execute();

    logger.debug({ id: entry.id }, 'Stored episodic memory');
  }

  async query(query: EpisodicQuery): Promise<MemoryEntry[]> {
    let q = this.db.selectFrom('episodic_memories').selectAll();

    if (query.agentId) {
      q = q.where('agent_id', '=', query.agentId);
    }
    if (query.taskId) {
      q = q.where('task_id', '=', query.taskId);
    }
    if (query.projectId) {
      q = q.where('project_id', '=', query.projectId);
    }
    if (query.startTime) {
      q = q.where('created_at', '>=', query.startTime);
    }
    if (query.endTime) {
      q = q.where('created_at', '<=', query.endTime);
    }
    if (query.eventType) {
      q = q.where('type', '=', query.eventType);
    }

    const results = await q
      .orderBy('created_at', 'desc')
      .limit(query.limit ?? 20)
      .execute();

    return results.map(this.rowToEntry);
  }

  async getById(id: string): Promise<MemoryEntry | null> {
    const result = await this.db
      .selectFrom('episodic_memories')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result ? this.rowToEntry(result) : null;
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('episodic_memories').where('id', '=', id).execute();
    logger.debug({ id }, 'Deleted episodic memory');
  }

  async count(): Promise<{ count: number }> {
    const result = await this.db
      .selectFrom('episodic_memories')
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirst();

    return { count: Number(result?.count ?? 0) };
  }

  private rowToEntry(row: any): MemoryEntry {
    return {
      id: row.id,
      content: row.content,
      type: row.type as MemoryEntry['type'],
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      agentId: row.agent_id ?? undefined,
      taskId: row.task_id ?? undefined,
      projectId: row.project_id ?? undefined,
      timestamp: new Date(row.created_at),
      importance: Number(row.importance ?? 1.0),
      tags: Array.isArray(row.tags) ? row.tags : typeof row.tags === 'string' ? JSON.parse(row.tags) : [],
    };
  }
}

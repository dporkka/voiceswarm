// @ts-nocheck
/**
 * Base repository class providing common CRUD operations.
 * All entity repositories extend this class.
 */

import type { Kysely, Selectable, Insertable, Updateable, Transaction } from 'kysely';
import type { Database } from '../schema.js';

export type { Transaction };

/** Base repository with CRUD operations */
export abstract class BaseRepository<T extends keyof Database> {
  protected readonly db: Kysely<Database>;
  protected readonly table: T;
  protected readonly primaryKey: string;

  constructor(db: Kysely<Database>, table: T, primaryKey = 'id') {
    this.db = db;
    this.table = table;
    this.primaryKey = primaryKey;
  }

  /** Find by primary key */
  async findById(id: string): Promise<Selectable<Database[T]> | undefined> {
    const result = await this.db
      .selectFrom(this.table)
      .selectAll()
      .where(this.primaryKey as never, '=', id)
      .executeTakeFirst();

    return result;
  }

  /** Find multiple by IDs */
  async findByIds(ids: string[]): Promise<Selectable<Database[T]>[]> {
    if (ids.length === 0) return [];

    return this.db
      .selectFrom(this.table)
      .selectAll()
      .where(this.primaryKey as never, 'in', ids)
      .execute();
  }

  /** Find all with pagination */
  async findAll(options?: { offset?: number; limit?: number; orderBy?: string; order?: 'asc' | 'desc' }): Promise<Selectable<Database[T]>[]> {
    let query = this.db.selectFrom(this.table).selectAll();

    if (options?.offset) query = query.offset(options.offset);
    if (options?.limit) query = query.limit(options.limit);
    if (options?.orderBy) query = query.orderBy(options.orderBy as never, options.order ?? 'asc');

    return query.execute();
  }

  /** Count all records */
  async count(): Promise<number> {
    const result = await this.db
      .selectFrom(this.table)
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirst();

    return Number(result?.count ?? 0);
  }

  /** Insert a new record */
  async insert(data: Insertable<Database[T]>): Promise<Selectable<Database[T]>> {
    return this.db
      .insertInto(this.table)
      .values(data as never)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /** Insert many records */
  async insertMany(data: Insertable<Database[T]>[]): Promise<Selectable<Database[T]>[]> {
    if (data.length === 0) return [];

    return this.db
      .insertInto(this.table)
      .values(data as never)
      .returningAll()
      .execute();
  }

  /** Update by primary key */
  async update(id: string, data: Updateable<Database[T]>): Promise<Selectable<Database[T]> | undefined> {
    return this.db
      .updateTable(this.table)
      .set({ ...data, updatedAt: new Date() } as never)
      .where(this.primaryKey as never, '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /** Delete by primary key */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom(this.table)
      .where(this.primaryKey as never, '=', id)
      .returning(this.primaryKey as never)
      .executeTakeFirst();

    return result !== undefined;
  }

  /** Soft delete (sets status to 'deleted' if table has status column) */
  async softDelete(id: string): Promise<void> {
    await this.db
      .updateTable(this.table)
      .set({ status: 'deleted', updatedAt: new Date() } as never)
      .where(this.primaryKey as never, '=', id)
      .execute();
  }

  /** Check if record exists */
  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .selectFrom(this.table)
      .select(this.primaryKey as never)
      .where(this.primaryKey as never, '=', id)
      .executeTakeFirst();

    return result !== undefined;
  }

  /** Execute within a transaction */
  async transaction<TxResult>(callback: (trx: Transaction<Database>) => Promise<TxResult>): Promise<TxResult> {
    return this.db.transaction().execute(callback);
  }
}

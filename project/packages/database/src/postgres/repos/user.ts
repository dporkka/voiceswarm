/**
 * User repository for PostgreSQL.
 */

import type { Kysely, Selectable, Insertable, Updateable } from 'kysely';
import type { Database } from '../schema.js';
import { BaseRepository } from './base.js';

export type UserRow = Selectable<Database['users']>;
export type UserInsert = Insertable<Database['users']>;
export type UserUpdate = Updateable<Database['users']>;

export class UserRepository extends BaseRepository<'users'> {
  constructor(db: Kysely<Database>) {
    super(db, 'users');
  }

  /** Find user by email */
  async findByEmail(email: string): Promise<UserRow | undefined> {
    return this.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();
  }

  /** Find users by organization */
  async findByOrgId(orgId: string, options?: { offset?: number; limit?: number }): Promise<UserRow[]> {
    return this.db
      .selectFrom('users')
      .selectAll()
      .innerJoin('orgMemberships', 'orgMemberships.userId', 'users.id')
      .where('orgMemberships.orgId', '=', orgId)
      .offset(options?.offset ?? 0)
      .limit(options?.limit ?? 100)
      .execute();
  }

  /** Find user by email with org membership */
  async findByEmailWithMemberships(email: string): Promise<{ user: UserRow; memberships: unknown[] } | undefined> {
    const user = await this.findByEmail(email);
    if (!user) return undefined;

    const memberships = await this.db
      .selectFrom('orgMemberships')
      .selectAll()
      .where('userId', '=', user.id)
      .execute();

    return { user, memberships };
  }

  /** Update last login timestamp */
  async updateLastLogin(id: string): Promise<void> {
    await this.db
      .updateTable('users')
      .set({ lastLoginAt: new Date() })
      .where('id', '=', id)
      .execute();
  }

  /** Verify email address */
  async verifyEmail(id: string): Promise<void> {
    await this.db
      .updateTable('users')
      .set({ emailVerified: true, updatedAt: new Date() })
      .where('id', '=', id)
      .execute();
  }

  /** Search users by name or email */
  async search(query: string, orgId?: string, limit = 20): Promise<UserRow[]> {
    let qb = this.db
      .selectFrom('users')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb('name', 'ilike', `%${query}%`),
          eb('email', 'ilike', `%${query}%`),
        ]),
      );

    if (orgId) {
      qb = qb
        .innerJoin('orgMemberships', 'orgMemberships.userId', 'users.id')
        .where('orgMemberships.orgId', '=', orgId);
    }

    return qb.limit(limit).execute();
  }
}

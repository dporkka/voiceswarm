/**
 * Kysely PostgreSQL client setup.
 * Provides a type-safe SQL query builder.
 */

import { Kysely, PostgresDialect, type Generated, type Selectable, type Insertable, type Updateable } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './schema.js';

// Re-export Kysely types
export type { Selectable, Insertable, Updateable };
export type DB = Kysely<Database>;
export type { Database } from './schema.js';

/** Create a new Kysely database client */
export function createPostgresClient(connectionString?: string): DB {
  const pool = new Pool({
    connectionString: connectionString ?? process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error', err);
  });

  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
    log(event) {
      if (event.level === 'error') {
        console.error('Query error:', event.error);
      }
    },
  });
}

/** Create a read replica client */
export function createReadReplicaClient(connectionString?: string): DB {
  const pool = new Pool({
    connectionString: connectionString ?? process.env.DATABASE_URL_REPLICA ?? process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
}

// ==================== Repository Exports ====================
export * from './repos/base.js';
export * from './repos/user.js';
export * from './repos/agent.js';
export * from './repos/task.js';
export * from './repos/project.js';
export * from './repos/workflow.js';
export * from './repos/memory.js';

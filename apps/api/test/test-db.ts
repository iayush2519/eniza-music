import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import * as schema from '../src/database/schema';

/**
 * Creates an isolated, in-memory Postgres-compatible database (via PGlite,
 * a WASM Postgres build) for e2e tests, and applies the same SQL
 * migrations used against real Postgres in
 * src/database/migrations — so tests run against the actual schema, not a
 * hand-maintained parallel copy of it.
 *
 * Connects directly through `drizzle-orm/pglite` (no socket server, no
 * TCP, no Docker) — this is a clean embedded-Postgres test double, not a
 * mock: real SQL, real constraints, real transactions.
 */
export async function createTestDatabase() {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  const migrationsDir = join(__dirname, '../src/database/migrations');
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    // drizzle-kit separates statements within a migration file with this
    // marker; each statement must be run individually against PGlite.
    const statements = sql.split('--> statement-breakpoint').map((statement) => statement.trim());

    for (const statement of statements) {
      if (statement.length > 0) {
        await client.exec(statement);
      }
    }
  }

  return {
    db,
    client,
    close: () => client.close(),
  };
}

export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>;

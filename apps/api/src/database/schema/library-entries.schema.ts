import { pgEnum, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

/**
 * A user's saved/liked tracks, albums, and followed artists — per
 * docs/architecture/content-model.md's `LibraryEntry` entity. Modeled as
 * one polymorphic table (`entityType` + `entityId`) rather than three
 * separate `liked_tracks`/`liked_albums`/`followed_artists` tables,
 * because the access pattern (a user's whole library, or "is X liked by
 * the current user") is identical across entity kinds and would otherwise
 * mean querying three tables and merging results everywhere this is read.
 *
 * `entityId` intentionally has no foreign key, since it can point at
 * `tracks`, `albums`, or `artists` depending on `entityType` — Postgres
 * has no native polymorphic FK. Referential integrity for this table is
 * enforced at the application layer (`LibraryService`), not the DB.
 */
export const libraryEntityTypeEnum = pgEnum('library_entity_type', ['track', 'album', 'artist']);

export const libraryEntries = pgTable(
  'library_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entityType: libraryEntityTypeEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('library_entries_user_entity_idx').on(
      table.userId,
      table.entityType,
      table.entityId,
    ),
  ],
);

export type LibraryEntry = typeof libraryEntries.$inferSelect;
export type NewLibraryEntry = typeof libraryEntries.$inferInsert;

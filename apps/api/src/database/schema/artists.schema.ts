import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

/**
 * Per docs/decisions/0007-provider-backed-music-catalog.md, this table is
 * no longer an owned artist profile — it is a **local metadata cache**
 * row, upserted by the (upcoming) `MusicGateway` from whatever a
 * `MusicProvider` reports. `providerId` + `externalId` together identify
 * the provider entity this row caches; the unique index on that pair is
 * the cache key (a given provider artist is cached at most once).
 * `lastRefreshedAt` drives staleness detection for background refresh
 * (added in a later milestone).
 *
 * `userId` is now **nullable**: a cached artist almost never corresponds
 * to one of our own accounts. The Phase 4 `not null unique` constraint
 * modeled artists as our own uploading users, which no longer applies —
 * see docs/architecture/content-model.md, "What did not carry forward."
 * The column and its (now nullable) unique constraint are kept in case a
 * future feature links a real user account to a cached artist (e.g. a
 * verified-artist claim flow), but nothing currently sets it.
 */
export const artists = pgTable(
  'artists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .unique(),
    providerId: text('provider_id'),
    externalId: text('external_id'),
    name: text('name').notNull(),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('artists_provider_id_external_id_idx').on(table.providerId, table.externalId),
  ],
);

export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;

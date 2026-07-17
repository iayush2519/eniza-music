import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { artists } from './artists.schema';

/**
 * Per docs/decisions/0007-provider-backed-music-catalog.md, this table is
 * a local metadata cache row (not owned content) — see artists.schema.ts
 * for the full rationale, which applies identically here. `providerId` +
 * `externalId` form the cache key; `lastRefreshedAt` drives background
 * refresh; `unavailable` is set when the provider reports the entity is
 * gone (see artists.schema.ts for the full rationale on both).
 *
 * Still belongs to one artist row (now itself a cache row); ordering of
 * tracks within an album still lives on `tracks.trackNumber`, not here.
 */
export const albums = pgTable(
  'albums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artistId: uuid('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),
    providerId: text('provider_id'),
    externalId: text('external_id'),
    title: text('title').notNull(),
    coverArtUrl: text('cover_art_url'),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    unavailable: boolean('unavailable').notNull().default(false),
    lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('albums_provider_id_external_id_idx').on(table.providerId, table.externalId),
  ],
);

export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;

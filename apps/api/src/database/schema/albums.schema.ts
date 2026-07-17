import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { artists } from './artists.schema';

/**
 * Belongs to one artist; an ordered collection of tracks (ordering lives on
 * `tracks.trackNumber`, not here — see tracks.schema.ts).
 */
export const albums = pgTable('albums', {
  id: uuid('id').primaryKey().defaultRandom(),
  artistId: uuid('artist_id')
    .notNull()
    .references(() => artists.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  coverArtUrl: text('cover_art_url'),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;

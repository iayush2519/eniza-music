import { integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { playlists } from './playlists.schema';
import { tracks } from './tracks.schema';

/**
 * Join table between playlists and tracks. `position` is an explicit
 * integer column (not row-insertion order) so reordering a playlist is a
 * single-row update, and a track can appear in the same playlist only
 * once (`playlistId` + `trackId` unique).
 */
export const playlistTracks = pgTable(
  'playlist_tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playlistId: uuid('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    trackId: uuid('track_id')
      .notNull()
      .references(() => tracks.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('playlist_tracks_playlist_id_track_id_idx').on(table.playlistId, table.trackId),
  ],
);

export type PlaylistTrack = typeof playlistTracks.$inferSelect;
export type NewPlaylistTrack = typeof playlistTracks.$inferInsert;

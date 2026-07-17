import { boolean, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { tracks } from './tracks.schema';
import { users } from './users.schema';

/**
 * One row per playback of a track, per
 * docs/architecture/music-provider-architecture.md's playback
 * architecture. `trackId` references the local metadata cache row (the
 * same table `playlist_tracks`/`library_entries` already reference), not
 * a raw provider id — so this table never needs to know which provider a
 * track came from.
 *
 * Written by the (upcoming) `playback` module: `playedAt` is set
 * immediately on stream-URL resolution (fire-and-forget, doesn't block
 * the response); `durationListenedSeconds`/`completed`/`skipped` are
 * updated as playback progresses. This is the primary input to
 * recommendations — per
 * docs/decisions/0007-provider-backed-music-catalog.md, a track skipped
 * in the first few seconds is a strong negative signal, a repeated full
 * listen is a strong positive one.
 */
export const listeningHistory = pgTable('listening_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  trackId: uuid('track_id')
    .notNull()
    .references(() => tracks.id, { onDelete: 'cascade' }),
  playedAt: timestamp('played_at', { withTimezone: true }).notNull().defaultNow(),
  durationListenedSeconds: integer('duration_listened_seconds'),
  completed: boolean('completed').notNull().default(false),
  skipped: boolean('skipped').notNull().default(false),
});

export type ListeningHistory = typeof listeningHistory.$inferSelect;
export type NewListeningHistory = typeof listeningHistory.$inferInsert;

import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { albums } from './albums.schema';
import { artists } from './artists.schema';

/**
 * Per docs/architecture/content-model.md, every track carries a `source`
 * discriminator so a future licensed-provider integration can be added
 * without a schema migration. Only `'upload'` is ever written today — the
 * enum exists so adding `'licensed_provider'` later is additive, not
 * disruptive.
 */
export const trackSourceKindEnum = pgEnum('track_source_kind', ['upload']);

/**
 * Licensing metadata modeled from day one for the same reason (see
 * content-model.md, "Rights/licensing metadata is modeled from day one").
 * Only `'artist_direct'` exists today.
 */
export const trackLicenseTypeEnum = pgEnum('track_license_type', ['artist_direct']);

/**
 * Belongs to one artist, optionally part of one album. `audioUrl` is a
 * direct URL to the audio file for now — Phase 4 scope is catalog CRUD and
 * seed data, not the `streaming` module's signed-URL resolution
 * (content-model.md's `resolvePlaybackUrl` port, planned for a later
 * phase alongside the `upload`/`storage` modules). Seeded tracks point at
 * freely licensed sample audio so the catalog is genuinely playable once
 * Phase 5's audio engine lands, without requiring real uploads first.
 */
export const tracks = pgTable('tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  artistId: uuid('artist_id')
    .notNull()
    .references(() => artists.id, { onDelete: 'cascade' }),
  albumId: uuid('album_id').references(() => albums.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  trackNumber: integer('track_number'),
  audioUrl: text('audio_url').notNull(),
  coverArtUrl: text('cover_art_url'),
  sourceKind: trackSourceKindEnum('source_kind').notNull().default('upload'),
  licenseType: trackLicenseTypeEnum('license_type').notNull().default('artist_direct'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;

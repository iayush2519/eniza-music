import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { albums } from './albums.schema';
import { artists } from './artists.schema';

/**
 * Originally added (Phase 4) so a future licensed-provider integration
 * could be added without a migration. That integration has now happened
 * — see docs/decisions/0007-provider-backed-music-catalog.md — and this
 * enum is superseded by the more precise `providerId` column below
 * (which names the actual provider, e.g. `'jamendo'`, rather than a
 * coarse category). Kept as-is rather than removed: no destructive change
 * was called for, and `'upload'` remains an accurate historical value for
 * rows seeded before the pivot.
 */
export const trackSourceKindEnum = pgEnum('track_source_kind', ['upload']);

/**
 * Licensing metadata modeled from day one for the same reason (see
 * content-model.md, "Rights/licensing metadata is modeled from day one").
 * Only `'artist_direct'` exists today.
 */
export const trackLicenseTypeEnum = pgEnum('track_license_type', ['artist_direct']);

/**
 * Per docs/decisions/0007-provider-backed-music-catalog.md, this table is
 * a local metadata cache row (not owned/uploaded content) — see
 * artists.schema.ts for the full rationale. `providerId` + `externalId`
 * form the cache key; `lastRefreshedAt` drives background refresh (added
 * in a later milestone). `audioUrl` is nullable: Phase 4 rows still have
 * one, but provider-cached rows never do — a stream URL is resolved on
 * demand via `MusicGateway.resolveStreamUrl` (see music-gateway.service.ts)
 * rather than stored here, since provider stream URLs can be short-TTL and
 * would go stale if cached permanently. `unavailable` is set when the
 * provider reports the entity is gone (see artists.schema.ts for the
 * full rationale).
 */
export const tracks = pgTable(
  'tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artistId: uuid('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),
    albumId: uuid('album_id').references(() => albums.id, { onDelete: 'set null' }),
    providerId: text('provider_id'),
    externalId: text('external_id'),
    title: text('title').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    trackNumber: integer('track_number'),
    audioUrl: text('audio_url'),
    coverArtUrl: text('cover_art_url'),
    sourceKind: trackSourceKindEnum('source_kind').notNull().default('upload'),
    licenseType: trackLicenseTypeEnum('license_type').notNull().default('artist_direct'),
    unavailable: boolean('unavailable').notNull().default(false),
    lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tracks_provider_id_external_id_idx').on(table.providerId, table.externalId),
  ],
);

export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;

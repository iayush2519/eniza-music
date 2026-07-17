import { hash } from '@node-rs/argon2';
import { inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { MockProvider } from '../discovery/providers/mock-provider';
import { MusicGateway } from '../discovery/music-gateway.service';
import { InlineMetadataRefreshQueue } from '../queue/inline-metadata-refresh-queue';
import * as schema from './schema';
import { libraryEntries, playlists, playlistTracks, users } from './schema';

/**
 * Seeds the database with a small, realistic demo: one listener account
 * with a starter playlist and a liked track, backed by cached metadata
 * from the mock `MusicProvider`.
 *
 * Per docs/decisions/0007-provider-backed-music-catalog.md, this no
 * longer inserts artists/albums/tracks directly — the local metadata
 * cache is populated the same way it is at runtime, by calling
 * `MusicGateway` (which normalizes and upserts whatever `MockProvider`
 * returns), rather than duplicating the cache-write logic here. This
 * also means the seed script genuinely exercises the real upsert path,
 * not a parallel one that could silently drift from it.
 *
 * Run via `pnpm run db:seed`. Safe to re-run: clears seed-owned rows
 * first (identified by the fixed seed email address below) rather than
 * assuming an empty database. Does not clear cache rows — those are
 * shared, provider-keyed data, not owned by any one seed run, and
 * `MusicGateway`'s upsert is idempotent regardless.
 */

const SEED_PASSWORD = 'SeedPass123';

const SEED_LISTENER = {
  email: 'seed-listener@example.com',
  displayName: 'Demo Listener',
};

/** Mock provider track ids to seed into the starter playlist, in order. */
const STARTER_PLAYLIST_TRACK_IDS = ['track-1', 'track-2', 'track-3'];

/** Mock provider track id the seed listener has already liked. */
const LIKED_TRACK_ID = 'track-1';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set to run the seed script (see .env.example).');
  }

  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });
  // Refresh is irrelevant for freshly-cached seed rows; the inline queue
  // (no Redis dependency) is sufficient here — same reasoning as its use
  // in tests, see queue/inline-metadata-refresh-queue.ts.
  const musicGateway = new MusicGateway(db, new MockProvider(), new InlineMetadataRefreshQueue());

  console.log('Seeding database...');

  await clearExistingSeedData(db, [SEED_LISTENER.email]);

  const passwordHash = await hash(SEED_PASSWORD);

  const [listener] = await db
    .insert(users)
    .values({
      email: SEED_LISTENER.email,
      passwordHash,
      displayName: SEED_LISTENER.displayName,
      isArtist: false,
    })
    .returning();

  const playlistTracksCache = await Promise.all(
    STARTER_PLAYLIST_TRACK_IDS.map((externalId) => musicGateway.fetchAndCacheTrack(externalId)),
  );

  const [starterPlaylist] = await db
    .insert(playlists)
    .values({
      userId: listener.id,
      title: 'Starter Playlist',
      description: 'A few favorites to get started.',
    })
    .returning();

  for (const [index, track] of playlistTracksCache.entries()) {
    if (!track) {
      continue;
    }
    await db.insert(playlistTracks).values({
      playlistId: starterPlaylist.id,
      trackId: track.id,
      position: index,
    });
  }

  const likedTrack = await musicGateway.fetchAndCacheTrack(LIKED_TRACK_ID);
  if (likedTrack) {
    await db.insert(libraryEntries).values({
      userId: listener.id,
      entityType: 'track',
      entityId: likedTrack.id,
    });
  }

  console.log(
    `  Seeded listener "${SEED_LISTENER.displayName}" with a starter playlist and a liked track.`,
  );
  console.log(`Done. Seed account uses the password: ${SEED_PASSWORD}`);

  await sql.end();
}

/**
 * Deletes only rows this script owns (matched by the fixed seed email
 * address), rather than truncating whole tables — safe to re-run against
 * a database that also has real user-created data.
 */
async function clearExistingSeedData(db: ReturnType<typeof drizzle>, seedEmails: string[]) {
  const existingSeedUsers = await db.select().from(users).where(inArray(users.email, seedEmails));

  for (const user of existingSeedUsers) {
    // ON DELETE CASCADE on every FK referencing users.id means removing
    // the seed user is sufficient to remove their playlists/
    // playlist_tracks/library_entries too.
    await db.delete(users).where(inArray(users.email, [user.email]));
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});

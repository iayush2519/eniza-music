import { hash } from '@node-rs/argon2';
import { inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';
import { albums, artists, playlists, playlistTracks, tracks, users } from './schema';

/**
 * Seeds the database with a small, realistic demo catalog: a handful of
 * artist accounts, albums, and tracks, plus one listener account with a
 * starter playlist.
 *
 * Track audio points at SoundHelix's freely-licensed sample MP3s
 * (https://www.soundhelix.com/audio-examples) — a long-standing, widely
 * used source of royalty-free placeholder music for exactly this purpose
 * (demos, tests, tutorials). This keeps the catalog genuinely playable
 * once Phase 5's audio engine lands, without requiring a real upload
 * pipeline first (that's the `upload` module, planned for a later phase
 * per docs/architecture/backend-architecture.md).
 *
 * Run via `pnpm run db:seed`. Safe to re-run: clears seed-owned rows
 * first (identified by the fixed seed email addresses below) rather than
 * assuming an empty database.
 */

const SOUNDHELIX_BASE_URL = 'https://www.soundhelix.com/examples/mp3';

const SEED_PASSWORD = 'SeedPass123';

type SeedTrack = {
  title: string;
  durationSeconds: number;
  trackNumber: number;
  soundHelixTrackNumber: number;
};

type SeedAlbum = {
  title: string;
  releasedAt: string;
  tracks: SeedTrack[];
};

type SeedArtist = {
  email: string;
  displayName: string;
  artistName: string;
  bio: string;
  albums: SeedAlbum[];
};

const SEED_ARTISTS: SeedArtist[] = [
  {
    email: 'seed-artist-1@example.com',
    displayName: 'Mara Lindqvist',
    artistName: 'Mara Lindqvist',
    bio: 'Ambient and downtempo electronic producer.',
    albums: [
      {
        title: 'Slow Static',
        releasedAt: '2025-03-14',
        tracks: [
          { title: 'Slow Static', durationSeconds: 244, trackNumber: 1, soundHelixTrackNumber: 1 },
          {
            title: 'Glass Weather',
            durationSeconds: 259,
            trackNumber: 2,
            soundHelixTrackNumber: 2,
          },
        ],
      },
    ],
  },
  {
    email: 'seed-artist-2@example.com',
    displayName: 'Julian Ferro',
    artistName: 'Julian Ferro',
    bio: 'Guitar-driven indie rock, three-piece band.',
    albums: [
      {
        title: 'Low Tide Radio',
        releasedAt: '2024-09-02',
        tracks: [
          {
            title: 'Low Tide Radio',
            durationSeconds: 231,
            trackNumber: 1,
            soundHelixTrackNumber: 3,
          },
          {
            title: 'Concrete Weather',
            durationSeconds: 267,
            trackNumber: 2,
            soundHelixTrackNumber: 4,
          },
        ],
      },
    ],
  },
  {
    email: 'seed-artist-3@example.com',
    displayName: 'Nadia Okafor',
    artistName: 'Nadia Okafor',
    bio: 'Neo-soul vocalist and multi-instrumentalist.',
    albums: [
      {
        title: 'Amber Hour',
        releasedAt: '2026-01-20',
        tracks: [
          { title: 'Amber Hour', durationSeconds: 252, trackNumber: 1, soundHelixTrackNumber: 5 },
        ],
      },
    ],
  },
];

const SEED_LISTENER = {
  email: 'seed-listener@example.com',
  displayName: 'Demo Listener',
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set to run the seed script (see .env.example).');
  }

  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  console.log('Seeding database...');

  const seedEmails = [...SEED_ARTISTS.map((artist) => artist.email), SEED_LISTENER.email];
  await clearExistingSeedData(db, seedEmails);

  const passwordHash = await hash(SEED_PASSWORD);

  for (const seedArtist of SEED_ARTISTS) {
    const [user] = await db
      .insert(users)
      .values({
        email: seedArtist.email,
        passwordHash,
        displayName: seedArtist.displayName,
        isArtist: true,
      })
      .returning();

    const [artist] = await db
      .insert(artists)
      .values({ userId: user.id, name: seedArtist.artistName, bio: seedArtist.bio })
      .returning();

    for (const seedAlbum of seedArtist.albums) {
      const [album] = await db
        .insert(albums)
        .values({
          artistId: artist.id,
          title: seedAlbum.title,
          releasedAt: new Date(seedAlbum.releasedAt),
        })
        .returning();

      for (const seedTrack of seedAlbum.tracks) {
        await db.insert(tracks).values({
          artistId: artist.id,
          albumId: album.id,
          title: seedTrack.title,
          durationSeconds: seedTrack.durationSeconds,
          trackNumber: seedTrack.trackNumber,
          audioUrl: `${SOUNDHELIX_BASE_URL}/SoundHelix-Song-${seedTrack.soundHelixTrackNumber}.mp3`,
        });
      }
    }

    console.log(
      `  Seeded artist "${seedArtist.artistName}" with ${seedArtist.albums.length} album(s).`,
    );
  }

  const [listener] = await db
    .insert(users)
    .values({
      email: SEED_LISTENER.email,
      passwordHash,
      displayName: SEED_LISTENER.displayName,
      isArtist: false,
    })
    .returning();

  const [starterPlaylist] = await db
    .insert(playlists)
    .values({
      userId: listener.id,
      title: 'Starter Playlist',
      description: 'A few favorites to get started.',
    })
    .returning();

  const allTracks = await db.select().from(tracks);
  const tracksForPlaylist = allTracks.slice(0, 3);

  for (const [index, track] of tracksForPlaylist.entries()) {
    await db.insert(playlistTracks).values({
      playlistId: starterPlaylist.id,
      trackId: track.id,
      position: index,
    });
  }

  console.log(`  Seeded listener "${SEED_LISTENER.displayName}" with a starter playlist.`);
  console.log(`Done. All seed accounts use the password: ${SEED_PASSWORD}`);

  await sql.end();
}

/**
 * Deletes only rows this script owns (matched by the fixed seed email
 * addresses), rather than truncating whole tables — safe to re-run
 * against a database that also has real user-created data.
 */
async function clearExistingSeedData(db: ReturnType<typeof drizzle>, seedEmails: string[]) {
  const existingSeedUsers = await db.select().from(users).where(inArray(users.email, seedEmails));

  for (const user of existingSeedUsers) {
    // ON DELETE CASCADE on every FK referencing users.id (directly or via
    // artists.id) means removing the seed users is sufficient to remove
    // their artists/albums/tracks/playlists/playlist_tracks too.
    await db.delete(users).where(inArray(users.email, [user.email]));
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});

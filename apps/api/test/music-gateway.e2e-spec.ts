import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { createTestDatabase, TestDatabase } from './test-db';
import { validateEnv } from '../src/config/env.validation';
import { DATABASE_CONNECTION } from '../src/database/database.constants';
import { DatabaseModule } from '../src/database/database.module';
import { DiscoveryModule } from '../src/discovery/discovery.module';
import { MusicGateway } from '../src/discovery/music-gateway.service';

/**
 * `MusicGateway` is exercised here rather than in a plain
 * `*.spec.ts` unit test because it needs a real database connection
 * (PGlite, via `createTestDatabase`) and PGlite's dynamic-import-based
 * WASM loading only works under the `--experimental-vm-modules` Node flag
 * that `pnpm run test:e2e` enables (see package.json) — the plain `jest`
 * unit-test config does not set this flag. There is no HTTP surface to
 * hit yet (no controller depends on `MusicGateway` until a later
 * milestone), so this talks to the service directly rather than through
 * `supertest`, unlike the other files in this directory.
 */
describe('MusicGateway (e2e)', () => {
  let testDb: TestDatabase;
  let gateway: MusicGateway;

  beforeAll(async () => {
    testDb = await createTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        DiscoveryModule,
      ],
    })
      .overrideProvider(DATABASE_CONNECTION)
      .useValue(testDb.db)
      .compile();

    gateway = moduleFixture.get(MusicGateway);
  });

  afterAll(async () => {
    await testDb.close();
  });

  describe('search', () => {
    it('normalizes and upserts provider results into the local cache', async () => {
      const result = await gateway.search('mara');

      expect(result.tracks.length).toBeGreaterThan(0);
      expect(result.artists).toHaveLength(1);
      expect(result.artists[0]).toMatchObject({ name: 'Mara Lindqvist', providerId: 'mock' });

      // Every returned track/album/artist is a real local cache row with
      // a stable uuid, not a raw provider passthrough.
      for (const track of result.tracks) {
        expect(track.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(track.providerId).toBe('mock');
        expect(track.externalId).not.toBeNull();
      }
    });

    it('does not create duplicate cache rows on a repeated search', async () => {
      await gateway.search('nadia');
      const firstResult = await gateway.search('nadia');
      const secondResult = await gateway.search('nadia');

      expect(secondResult.tracks.map((t) => t.id).sort()).toEqual(
        firstResult.tracks.map((t) => t.id).sort(),
      );
      expect(secondResult.artists.map((a) => a.id).sort()).toEqual(
        firstResult.artists.map((a) => a.id).sort(),
      );
    });
  });

  describe('getTrack / getAlbum / getArtist', () => {
    it('reads a cached track back by its local id', async () => {
      const { tracks } = await gateway.search('julian', { type: 'track' });
      const track = tracks[0];

      const fetched = await gateway.getTrack(track.id);
      expect(fetched).toMatchObject({ id: track.id, title: track.title });
    });

    it('returns undefined for an unknown local id', async () => {
      await expect(
        gateway.getTrack('00000000-0000-0000-0000-000000000000'),
      ).resolves.toBeUndefined();
    });
  });

  describe('fetchAndCacheTrack', () => {
    it('caches a track by provider externalId and links its artist and album', async () => {
      const track = await gateway.fetchAndCacheTrack('track-1');

      expect(track).not.toBeNull();
      expect(track?.title).toBe('Slow Static');
      expect(track?.albumId).not.toBeNull();

      const album = track?.albumId ? await gateway.getAlbum(track.albumId) : undefined;
      expect(album?.title).toBe('Slow Static');

      const artist = track ? await gateway.getArtist(track.artistId) : undefined;
      expect(artist?.name).toBe('Mara Lindqvist');
    });

    it('returns null for an unknown provider externalId', async () => {
      await expect(gateway.fetchAndCacheTrack('does-not-exist')).resolves.toBeNull();
    });
  });

  describe('resolveStreamUrl', () => {
    it('resolves a playable URL for a cached track', async () => {
      const track = await gateway.fetchAndCacheTrack('track-1');
      const stream = await gateway.resolveStreamUrl(track!.id);

      expect(stream.url).toMatch(/^https:\/\//);
    });

    it('throws for an unknown local track id', async () => {
      await expect(
        gateway.resolveStreamUrl('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow();
    });
  });

  describe('getRelatedTracks', () => {
    it('returns other cached tracks by the same artist', async () => {
      const track = await gateway.fetchAndCacheTrack('track-1');
      const related = await gateway.getRelatedTracks(track!.id);

      expect(related.length).toBeGreaterThan(0);
      expect(related.every((t) => t.artistId === track!.artistId)).toBe(true);
      expect(related.some((t) => t.id === track!.id)).toBe(false);
    });

    it('returns an empty array for an unknown local track id', async () => {
      await expect(
        gateway.getRelatedTracks('00000000-0000-0000-0000-000000000000'),
      ).resolves.toEqual([]);
    });
  });
});

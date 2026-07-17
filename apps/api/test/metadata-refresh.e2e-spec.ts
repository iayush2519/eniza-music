import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';

import { createTestDatabase, TestDatabase } from './test-db';
import { validateEnv } from '../src/config/env.validation';
import { DATABASE_CONNECTION } from '../src/database/database.constants';
import { DatabaseModule } from '../src/database/database.module';
import { artists, tracks } from '../src/database/schema';
import { DiscoveryModule } from '../src/discovery/discovery.module';
import { MetadataRefreshSweepService } from '../src/discovery/jobs/metadata-refresh-sweep.service';
import { MusicGateway } from '../src/discovery/music-gateway.service';

async function waitForMicrotasks(): Promise<void> {
  // InlineMetadataRefreshQueue (the active queue here — no REDIS_URL is
  // ever set in the e2e environment, see jest-e2e-setup.ts) processes
  // enqueued jobs via `queueMicrotask`, not synchronously. A short delay
  // lets that scheduled work actually run before assertions check its
  // effect, same pattern as the fire-and-forget history writes tested in
  // search.e2e-spec.ts/playback.e2e-spec.ts.
  await new Promise((resolve) => setTimeout(resolve, 50));
}

/**
 * End-to-end coverage for background metadata refresh, per
 * docs/architecture/music-provider-architecture.md. Exercises the real
 * `InlineMetadataRefreshQueue` (no `REDIS_URL` is configured anywhere in
 * the e2e environment, matching `DiscoveryModule`'s provider-selection
 * factory reasoning for `ACTIVE_MUSIC_PROVIDER`) rather than mocking the
 * queue, so this test proves the lazy-refresh-on-read and scheduled-sweep
 * paths genuinely wire together end to end: `MusicGateway` enqueues →
 * `InlineMetadataRefreshQueue` runs the job → `MetadataRefreshProcessor`
 * dispatches it → `MusicGateway.refreshTrack` updates the row in place.
 */
describe('Metadata refresh (e2e)', () => {
  let testDb: TestDatabase;
  let gateway: MusicGateway;
  let sweepService: MetadataRefreshSweepService;

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

    // MetadataRefreshProcessor registers itself with the queue in
    // onModuleInit — init() (not just compile()) is required for that
    // wiring to actually run.
    await moduleFixture.init();

    gateway = moduleFixture.get(MusicGateway);
    sweepService = moduleFixture.get(MetadataRefreshSweepService);
  });

  afterAll(async () => {
    await testDb.close();
  });

  async function backdateLastRefreshedAt(trackId: string, hoursAgo: number): Promise<void> {
    await testDb.db
      .update(tracks)
      .set({ lastRefreshedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000) })
      .where(eq(tracks.id, trackId));
  }

  describe('lazy refresh on read', () => {
    it('still returns a stale row immediately, and refreshes it in the background', async () => {
      const track = await gateway.fetchAndCacheTrack('track-3');
      await backdateLastRefreshedAt(track!.id, 25); // older than the 24h TTL

      const readBeforeRefresh = await gateway.getTrack(track!.id);
      expect(readBeforeRefresh).toBeDefined(); // never blocks on the refresh

      await waitForMicrotasks();

      const [refreshed] = await testDb.db.select().from(tracks).where(eq(tracks.id, track!.id));
      expect(refreshed.lastRefreshedAt.getTime()).toBeGreaterThan(
        readBeforeRefresh!.lastRefreshedAt.getTime(),
      );
    });

    it('does not enqueue a refresh for a row that is still fresh', async () => {
      const track = await gateway.fetchAndCacheTrack('track-4');
      const freshLastRefreshedAt = track!.lastRefreshedAt.getTime();

      await gateway.getTrack(track!.id);
      await waitForMicrotasks();

      const [row] = await testDb.db.select().from(tracks).where(eq(tracks.id, track!.id));
      expect(row.lastRefreshedAt.getTime()).toBe(freshLastRefreshedAt);
    });
  });

  describe('refreshTrack', () => {
    it('flags a cached row unavailable when the provider no longer has it', async () => {
      // Directly insert a cache row referencing a providerId/externalId
      // pair the active MockProvider doesn't recognize, simulating a
      // provider-side deletion without needing a second fake provider.
      const [artist] = await testDb.db.select().from(artists).limit(1);
      const [orphanTrack] = await testDb.db
        .insert(tracks)
        .values({
          artistId: artist.id,
          providerId: 'mock',
          externalId: 'no-longer-exists',
          title: 'Ghost Track',
          durationSeconds: 100,
        })
        .returning();

      await gateway.refreshTrack(orphanTrack.id);

      const [refreshed] = await testDb.db
        .select()
        .from(tracks)
        .where(eq(tracks.id, orphanTrack.id));
      expect(refreshed.unavailable).toBe(true);
    });
  });

  describe('scheduled sweep', () => {
    it('finds and refreshes stale rows the lazy path never touched', async () => {
      const track = await gateway.fetchAndCacheTrack('track-5');
      await backdateLastRefreshedAt(track!.id, 48);

      const staleBeforeSweep = await gateway.findStaleEntities(100);
      expect(staleBeforeSweep.some((job) => job.localId === track!.id)).toBe(true);

      await sweepService.sweep();
      await waitForMicrotasks();

      const [refreshed] = await testDb.db.select().from(tracks).where(eq(tracks.id, track!.id));
      expect(refreshed.lastRefreshedAt.getTime()).toBeGreaterThan(Date.now() - 60 * 1000);
    });

    it('is a no-op when there is nothing stale', async () => {
      await expect(sweepService.sweep()).resolves.not.toThrow();
    });
  });
});

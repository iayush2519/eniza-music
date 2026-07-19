import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { createTestDatabase, TestDatabase } from './test-db';
import { AuthModule } from '../src/auth/auth.module';
import { AuthResponseDto } from '../src/auth/dto/auth-response.dto';
import { validateEnv } from '../src/config/env.validation';
import { DATABASE_CONNECTION } from '../src/database/database.constants';
import { DatabaseModule } from '../src/database/database.module';
import { libraryEntries, listeningHistory } from '../src/database/schema';
import { DiscoveryModule } from '../src/discovery/discovery.module';
import { MusicGateway } from '../src/discovery/music-gateway.service';
import { LibraryModule } from '../src/library/library.module';
import { RecommendationSectionResponseDto } from '../src/recommendations/dto';
import { RecommendationsModule } from '../src/recommendations/recommendations.module';
import { UsersModule } from '../src/users/users.module';

function asAuthResponse(body: unknown): AuthResponseDto {
  return body as AuthResponseDto;
}

/**
 * End-to-end coverage for `GET /recommendations`. Uses the real
 * `MockProvider` (no `JAMENDO_CLIENT_ID` is set anywhere in the e2e
 * environment — see jest-e2e-setup.ts), so `getRelatedTracks` results
 * are deterministic and don't depend on network access.
 */
describe('Recommendations (e2e)', () => {
  let app: INestApplication<App>;
  let testDb: TestDatabase;
  let musicGateway: MusicGateway;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    testDb = await createTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        UsersModule,
        AuthModule,
        DiscoveryModule,
        LibraryModule,
        RecommendationsModule,
      ],
    })
      .overrideProvider(DATABASE_CONNECTION)
      .useValue(testDb.db)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    musicGateway = moduleFixture.get(MusicGateway);

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `recommendations-test-${Date.now()}@example.com`,
        password: 'Str0ngPass1',
        displayName: 'Recommendations Test User',
      })
      .expect(201);

    const authResponse = asAuthResponse(registerResponse.body);
    accessToken = authResponse.accessToken;
    userId = authResponse.user.id;
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  describe('GET /recommendations', () => {
    it('rejects an unauthenticated request with 401', async () => {
      await request(app.getHttpServer()).get('/recommendations').expect(401);
    });

    it('returns an empty array for a user with no history or likes', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('includes a "Recently played" section once the user has listening history', async () => {
      const track = await musicGateway.fetchAndCacheTrack('track-1');
      await testDb.db.insert(listeningHistory).values({ userId, trackId: track!.id });

      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const sections = response.body as RecommendationSectionResponseDto[];

      const recentlyPlayed = sections.find((section) => section.id === 'recently-played');
      expect(recentlyPlayed).toBeDefined();
      expect(recentlyPlayed?.title).toBe('Recently played');
      expect(recentlyPlayed?.tracks.some((t) => t.id === track!.id)).toBe(true);
    });

    it('includes a "For you" section derived from the most-played artist', async () => {
      // track-1 and track-2 (mock provider) share the same artist —
      // having played track-1 should surface track-2 in "For you".
      const track1 = await musicGateway.fetchAndCacheTrack('track-1');
      const track2 = await musicGateway.fetchAndCacheTrack('track-2');
      await testDb.db.insert(listeningHistory).values({ userId, trackId: track1!.id });

      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const sections = response.body as RecommendationSectionResponseDto[];

      const forYou = sections.find((section) => section.id === 'for-you');
      expect(forYou).toBeDefined();
      expect(forYou?.tracks.some((t) => t.id === track2!.id)).toBe(true);
      // Never recommends a track the user has already listened to.
      expect(forYou?.tracks.some((t) => t.id === track1!.id)).toBe(false);
    });

    it('includes a "Because you liked" section enriched via the provider', async () => {
      const track = await musicGateway.fetchAndCacheTrack('track-1');
      await testDb.db.insert(libraryEntries).values({
        userId,
        entityType: 'track',
        entityId: track!.id,
      });

      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const sections = response.body as RecommendationSectionResponseDto[];

      const becauseYouLiked = sections.find((section) =>
        section.id.startsWith('because-you-liked-'),
      );
      expect(becauseYouLiked).toBeDefined();
      expect(becauseYouLiked?.title).toContain(track!.title);
      expect(becauseYouLiked?.tracks.length).toBeGreaterThan(0);
    });

    it('includes a "Continue listening" section for a track played past the minimum threshold but not finished', async () => {
      const track = await musicGateway.fetchAndCacheTrack('track-3');
      await testDb.db.insert(listeningHistory).values({
        userId,
        trackId: track!.id,
        durationListenedSeconds: 30,
        completed: false,
        skipped: false,
      });

      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const sections = response.body as RecommendationSectionResponseDto[];

      const continueListening = sections.find((section) => section.id === 'continue-listening');
      expect(continueListening).toBeDefined();
      expect(continueListening?.tracks.some((t) => t.id === track!.id)).toBe(true);
    });

    it('omits "Continue listening" for a track that was completed', async () => {
      const track = await musicGateway.fetchAndCacheTrack('track-4');
      await testDb.db.insert(listeningHistory).values({
        userId,
        trackId: track!.id,
        durationListenedSeconds: 250,
        completed: true,
        skipped: false,
      });

      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const sections = response.body as RecommendationSectionResponseDto[];

      const continueListening = sections.find((section) => section.id === 'continue-listening');
      expect(continueListening?.tracks.some((t) => t.id === track!.id)).toBeFalsy();
    });

    it('omits "Continue listening" for a track only listened to for a few seconds', async () => {
      const track = await musicGateway.fetchAndCacheTrack('track-5');
      await testDb.db.insert(listeningHistory).values({
        userId,
        trackId: track!.id,
        durationListenedSeconds: 3,
        completed: false,
        skipped: false,
      });

      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const sections = response.body as RecommendationSectionResponseDto[];

      const continueListening = sections.find((section) => section.id === 'continue-listening');
      expect(continueListening?.tracks.some((t) => t.id === track!.id)).toBeFalsy();
    });

    it('includes a "Trending now" section reflecting plays across all users', async () => {
      const track = await musicGateway.fetchAndCacheTrack('track-1');
      // A second, unrelated user's play counts toward global trending —
      // this is deliberately not scoped to `userId`.
      const otherUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `trending-other-${Date.now()}@example.com`,
          password: 'Str0ngPass1',
          displayName: 'Other User',
        })
        .expect(201);
      const otherUserId = asAuthResponse(otherUserResponse.body).user.id;
      await testDb.db.insert(listeningHistory).values({ userId: otherUserId, trackId: track!.id });

      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const sections = response.body as RecommendationSectionResponseDto[];

      const trending = sections.find((section) => section.id === 'trending');
      expect(trending).toBeDefined();
      expect(trending?.title).toBe('Trending now');
      expect(trending?.tracks.some((t) => t.id === track!.id)).toBe(true);
    });
  });
});

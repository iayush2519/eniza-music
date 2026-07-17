import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types';

import { createTestDatabase, TestDatabase } from './test-db';
import { AuthModule } from '../src/auth/auth.module';
import { AuthResponseDto } from '../src/auth/dto/auth-response.dto';
import { validateEnv } from '../src/config/env.validation';
import { DATABASE_CONNECTION } from '../src/database/database.constants';
import { DatabaseModule } from '../src/database/database.module';
import { listeningHistory } from '../src/database/schema';
import { DiscoveryModule } from '../src/discovery/discovery.module';
import { MusicGateway } from '../src/discovery/music-gateway.service';
import { ResolvedStreamResponseDto } from '../src/playback/dto';
import { PlaybackModule } from '../src/playback/playback.module';
import { UsersModule } from '../src/users/users.module';

function asAuthResponse(body: unknown): AuthResponseDto {
  return body as AuthResponseDto;
}

/**
 * End-to-end coverage for `GET /playback/resolve/:trackId`. Uses the
 * real `MockProvider` (no `JAMENDO_CLIENT_ID` is set anywhere in the
 * e2e environment — see jest-e2e-setup.ts — so `DiscoveryModule`'s
 * provider-selection factory always resolves to `MockProvider` here),
 * so stream URLs are deterministic and don't depend on network access.
 */
describe('Playback (e2e)', () => {
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
        PlaybackModule,
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
        email: `playback-test-${Date.now()}@example.com`,
        password: 'Str0ngPass1',
        displayName: 'Playback Test User',
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

  describe('GET /playback/resolve/:trackId', () => {
    it('rejects an unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .get('/playback/resolve/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('returns 404 for a local id that is not a cached track', async () => {
      await request(app.getHttpServer())
        .get('/playback/resolve/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('resolves a playable stream URL for a cached track', async () => {
      const track = await musicGateway.fetchAndCacheTrack('track-1');

      const response = await request(app.getHttpServer())
        .get(`/playback/resolve/${track!.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const body = response.body as ResolvedStreamResponseDto;

      expect(body.url).toMatch(/^https:\/\//);
      expect(body.expiresAt).toBeNull();
    });

    it('records a listening_history row for the requesting user', async () => {
      const track = await musicGateway.fetchAndCacheTrack('track-2');

      await request(app.getHttpServer())
        .get(`/playback/resolve/${track!.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // The write is fire-and-forget (see playback.service.ts) — poll
      // briefly rather than asserting immediately after the response.
      await new Promise((resolve) => setTimeout(resolve, 50));

      const rows = await testDb.db
        .select()
        .from(listeningHistory)
        .where(and(eq(listeningHistory.userId, userId), eq(listeningHistory.trackId, track!.id)));

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        userId,
        trackId: track!.id,
        completed: false,
        skipped: false,
      });
    });
  });
});

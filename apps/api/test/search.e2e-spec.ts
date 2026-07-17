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
import { searchHistory } from '../src/database/schema';
import { DiscoveryModule } from '../src/discovery/discovery.module';
import { SearchResponseDto } from '../src/discovery/dto';
import { UsersModule } from '../src/users/users.module';

function asAuthResponse(body: unknown): AuthResponseDto {
  return body as AuthResponseDto;
}

/**
 * End-to-end coverage for `GET /search`. Uses the real `MockProvider`
 * (no `JAMENDO_CLIENT_ID` is set anywhere in the e2e environment — see
 * jest-e2e-setup.ts — so `DiscoveryModule`'s provider-selection factory
 * always resolves to `MockProvider` here), so results are deterministic
 * and don't depend on network access.
 */
describe('Search (e2e)', () => {
  let app: INestApplication<App>;
  let testDb: TestDatabase;
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

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `search-test-${Date.now()}@example.com`,
        password: 'Str0ngPass1',
        displayName: 'Search Test User',
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

  describe('GET /search', () => {
    it('rejects an unauthenticated request with 401', async () => {
      await request(app.getHttpServer()).get('/search').query({ q: 'mara' }).expect(401);
    });

    it('rejects a missing query parameter with 400', async () => {
      await request(app.getHttpServer())
        .get('/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('returns normalized track/album/artist results for a matching query', async () => {
      const response = await request(app.getHttpServer())
        .get('/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ q: 'mara' })
        .expect(200);
      const body = response.body as SearchResponseDto;

      expect(body.tracks.length).toBeGreaterThan(0);
      expect(body.artists).toHaveLength(1);
      expect(body.artists[0]).toMatchObject({ name: 'Mara Lindqvist' });

      // Every result is a real local cache row (a stable uuid id), not a
      // raw provider passthrough — see music-gateway.service.ts.
      for (const track of body.tracks) {
        expect(track.id).toMatch(/^[0-9a-f-]{36}$/);
      }
    });

    it('returns empty result arrays for a query with no matches', async () => {
      const response = await request(app.getHttpServer())
        .get('/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ q: 'no-such-artist-or-track-exists' })
        .expect(200);

      expect(response.body).toEqual({ tracks: [], albums: [], artists: [] });
    });

    it('restricts results to the requested entity type', async () => {
      const response = await request(app.getHttpServer())
        .get('/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ q: 'mara', type: 'artist' })
        .expect(200);
      const body = response.body as SearchResponseDto;

      expect(body.tracks).toEqual([]);
      expect(body.albums).toEqual([]);
      expect(body.artists.length).toBeGreaterThan(0);
    });

    it('rejects an invalid type value with 400', async () => {
      await request(app.getHttpServer())
        .get('/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ q: 'mara', type: 'not-a-real-type' })
        .expect(400);
    });

    it('records a search_history row for the requesting user', async () => {
      const query = `history-check-${Date.now()}`;
      await request(app.getHttpServer())
        .get('/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ q: query })
        .expect(200);

      // The write is fire-and-forget (see search.service.ts) — poll
      // briefly rather than asserting immediately after the response.
      await new Promise((resolve) => setTimeout(resolve, 50));

      const rows = await testDb.db
        .select()
        .from(searchHistory)
        .where(and(eq(searchHistory.userId, userId), eq(searchHistory.query, query)));

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ userId, query, resultCount: 0 });
    });
  });
});

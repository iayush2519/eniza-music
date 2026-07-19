import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { createTestDatabase, TestDatabase } from './test-db';
import { AlbumResponseDto, ArtistResponseDto, TrackResponseDto } from '../src/catalog/dto';
import { CatalogModule } from '../src/catalog/catalog.module';
import { validateEnv } from '../src/config/env.validation';
import { DATABASE_CONNECTION } from '../src/database/database.constants';
import { DatabaseModule } from '../src/database/database.module';
import { albums, artists, tracks, users } from '../src/database/schema';

/**
 * End-to-end coverage for the local metadata cache's read-only routes
 * that survived Milestone 12's retirement of the old "browse everything"
 * surface (see catalog.controller.ts) — single-entity lookups by id and
 * scoped relational reads. Unlike `auth`/`library`, these endpoints
 * require no authentication — verified explicitly below (no
 * Authorization header is ever sent in this suite).
 */
describe('Catalog (e2e)', () => {
  let app: INestApplication<App>;
  let testDb: TestDatabase;
  let artistId: string;
  let albumId: string;
  let trackId: string;

  beforeAll(async () => {
    testDb = await createTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        CatalogModule,
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

    const [user] = await testDb.db
      .insert(users)
      .values({
        email: 'catalog-test-artist@example.com',
        passwordHash: 'not-a-real-hash',
        displayName: 'Catalog Test Artist',
        isArtist: true,
      })
      .returning();

    const [artist] = await testDb.db
      .insert(artists)
      .values({ userId: user.id, name: 'Catalog Test Artist', bio: 'A test artist' })
      .returning();
    artistId = artist.id;

    const [album] = await testDb.db
      .insert(albums)
      .values({ artistId, title: 'Test Album', releasedAt: new Date('2025-06-01') })
      .returning();
    albumId = album.id;

    const [track] = await testDb.db
      .insert(tracks)
      .values({
        artistId,
        albumId,
        title: 'Unique Searchable Title',
        durationSeconds: 200,
        trackNumber: 1,
        audioUrl: 'https://example.com/track.mp3',
      })
      .returning();
    trackId = track.id;
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  describe('GET /catalog/tracks/:id', () => {
    it('returns a single track by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/catalog/tracks/${trackId}`)
        .expect(200);
      const body = response.body as TrackResponseDto;

      expect(body.id).toBe(trackId);
      expect(body.title).toBe('Unique Searchable Title');
    });

    it('returns 404 for a non-existent track id', async () => {
      await request(app.getHttpServer())
        .get('/catalog/tracks/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('GET /catalog/albums/:id/tracks', () => {
    it("returns an album's tracks", async () => {
      const response = await request(app.getHttpServer())
        .get(`/catalog/albums/${albumId}/tracks`)
        .expect(200);
      const body = response.body as TrackResponseDto[];

      expect(body).toHaveLength(1);
      expect(body[0].id).toBe(trackId);
    });
  });

  describe('GET /catalog/artists', () => {
    it('lists artists', async () => {
      const response = await request(app.getHttpServer()).get('/catalog/artists').expect(200);
      const body = response.body as ArtistResponseDto[];

      expect(body.some((artist) => artist.id === artistId)).toBe(true);
    });
  });

  describe('GET /catalog/artists/:id', () => {
    it('returns 404 for a non-existent artist id', async () => {
      await request(app.getHttpServer())
        .get('/catalog/artists/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('GET /catalog/artists/:id/albums', () => {
    it("returns an artist's albums", async () => {
      const response = await request(app.getHttpServer())
        .get(`/catalog/artists/${artistId}/albums`)
        .expect(200);
      const body = response.body as AlbumResponseDto[];

      expect(body.some((album) => album.id === albumId)).toBe(true);
    });
  });

  describe('GET /catalog/albums/new-releases', () => {
    it('requires no authentication and returns albums ordered by release date descending', async () => {
      const [olderAlbum] = await testDb.db
        .insert(albums)
        .values({ artistId, title: 'Older Album', releasedAt: new Date('2020-01-01') })
        .returning();
      const [newerAlbum] = await testDb.db
        .insert(albums)
        .values({ artistId, title: 'Newer Album', releasedAt: new Date('2026-01-01') })
        .returning();

      const response = await request(app.getHttpServer())
        .get('/catalog/albums/new-releases')
        .expect(200);
      const body = response.body as AlbumResponseDto[];

      const newerIndex = body.findIndex((album) => album.id === newerAlbum.id);
      const olderIndex = body.findIndex((album) => album.id === olderAlbum.id);
      expect(newerIndex).toBeGreaterThanOrEqual(0);
      expect(olderIndex).toBeGreaterThanOrEqual(0);
      expect(newerIndex).toBeLessThan(olderIndex);
    });

    it('excludes albums with no release date', async () => {
      const [undatedAlbum] = await testDb.db
        .insert(albums)
        .values({ artistId, title: 'Undated Album', releasedAt: null })
        .returning();

      const response = await request(app.getHttpServer())
        .get('/catalog/albums/new-releases')
        .expect(200);
      const body = response.body as AlbumResponseDto[];

      expect(body.some((album) => album.id === undatedAlbum.id)).toBe(false);
    });

    it('is matched ahead of the :id route and never treated as an album id lookup', async () => {
      // Regression guard for the exact routing hazard this endpoint's
      // own doc comment (catalog.controller.ts) calls out.
      await request(app.getHttpServer()).get('/catalog/albums/new-releases').expect(200);
    });

    it('respects limit and offset for pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await testDb.db.insert(albums).values({
          artistId,
          title: `Paginated Album ${i}`,
          releasedAt: new Date(2025, 0, i + 1),
        });
      }

      const firstPage = await request(app.getHttpServer())
        .get('/catalog/albums/new-releases')
        .query({ limit: 2, offset: 0 })
        .expect(200);
      const secondPage = await request(app.getHttpServer())
        .get('/catalog/albums/new-releases')
        .query({ limit: 2, offset: 2 })
        .expect(200);

      expect((firstPage.body as AlbumResponseDto[]).length).toBeLessThanOrEqual(2);
      expect((secondPage.body as AlbumResponseDto[]).length).toBeLessThanOrEqual(2);
      const firstIds = new Set((firstPage.body as AlbumResponseDto[]).map((a) => a.id));
      const secondIds = new Set((secondPage.body as AlbumResponseDto[]).map((a) => a.id));
      for (const id of secondIds) {
        expect(firstIds.has(id)).toBe(false);
      }
    });

    it('rejects a non-integer limit with 400', async () => {
      await request(app.getHttpServer())
        .get('/catalog/albums/new-releases')
        .query({ limit: 'not-a-number' })
        .expect(400);
    });
  });
});

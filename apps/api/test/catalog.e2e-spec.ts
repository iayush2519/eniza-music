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
});

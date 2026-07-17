import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { createTestDatabase, TestDatabase } from './test-db';
import { AuthModule } from '../src/auth/auth.module';
import { AuthResponseDto } from '../src/auth/dto/auth-response.dto';
import { CatalogModule } from '../src/catalog/catalog.module';
import { validateEnv } from '../src/config/env.validation';
import { DATABASE_CONNECTION } from '../src/database/database.constants';
import { DatabaseModule } from '../src/database/database.module';
import { artists, tracks, users } from '../src/database/schema';
import {
  LibraryEntryResponseDto,
  PlaylistResponseDto,
  PlaylistWithTracksResponseDto,
} from '../src/library/dto';
import { LibraryModule } from '../src/library/library.module';
import { UsersModule } from '../src/users/users.module';

function asAuthResponse(body: unknown): AuthResponseDto {
  return body as AuthResponseDto;
}

/**
 * End-to-end coverage for the authenticated library surface: playlists
 * (CRUD + track membership) and saved (liked/followed) entities. Every
 * route requires a valid access token; ownership isolation between two
 * different users is verified explicitly (a user must never be able to
 * read or mutate another user's playlist).
 */
describe('Library (e2e)', () => {
  let app: INestApplication<App>;
  let testDb: TestDatabase;
  let trackId: string;

  beforeAll(async () => {
    testDb = await createTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        UsersModule,
        AuthModule,
        CatalogModule,
        LibraryModule,
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

    const [catalogUser] = await testDb.db
      .insert(users)
      .values({
        email: 'library-test-artist@example.com',
        passwordHash: 'not-a-real-hash',
        displayName: 'Library Test Artist',
        isArtist: true,
      })
      .returning();
    const [artist] = await testDb.db
      .insert(artists)
      .values({ userId: catalogUser.id, name: 'Library Test Artist' })
      .returning();
    const [track] = await testDb.db
      .insert(tracks)
      .values({
        artistId: artist.id,
        title: 'Library Test Track',
        durationSeconds: 180,
        audioUrl: 'https://example.com/library-test-track.mp3',
      })
      .returning();
    trackId = track.id;
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  async function registerAndGetToken(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ngPass1', displayName: 'Library Test User' })
      .expect(201);
    return asAuthResponse(response.body).accessToken;
  }

  describe('authentication requirement', () => {
    it('rejects an unauthenticated request to list playlists with 401', async () => {
      await request(app.getHttpServer()).get('/library/playlists').expect(401);
    });

    it('rejects an unauthenticated request to create a playlist with 401', async () => {
      await request(app.getHttpServer())
        .post('/library/playlists')
        .send({ title: 'Should not be created' })
        .expect(401);
    });
  });

  describe('playlist CRUD', () => {
    it('creates, reads, updates, and deletes a playlist', async () => {
      const token = await registerAndGetToken(`playlist-crud-${Date.now()}@example.com`);
      const authHeader = `Bearer ${token}`;

      const createResponse = await request(app.getHttpServer())
        .post('/library/playlists')
        .set('Authorization', authHeader)
        .send({ title: 'My Playlist', description: 'A description' })
        .expect(201);
      const created = createResponse.body as PlaylistResponseDto;
      expect(created.title).toBe('My Playlist');

      const listResponse = await request(app.getHttpServer())
        .get('/library/playlists')
        .set('Authorization', authHeader)
        .expect(200);
      const list = listResponse.body as PlaylistResponseDto[];
      expect(list.some((playlist) => playlist.id === created.id)).toBe(true);

      const getResponse = await request(app.getHttpServer())
        .get(`/library/playlists/${created.id}`)
        .set('Authorization', authHeader)
        .expect(200);
      const fetched = getResponse.body as PlaylistWithTracksResponseDto;
      expect(fetched.tracks).toEqual([]);

      const updateResponse = await request(app.getHttpServer())
        .patch(`/library/playlists/${created.id}`)
        .set('Authorization', authHeader)
        .send({ title: 'Renamed Playlist' })
        .expect(200);
      expect((updateResponse.body as PlaylistResponseDto).title).toBe('Renamed Playlist');

      await request(app.getHttpServer())
        .delete(`/library/playlists/${created.id}`)
        .set('Authorization', authHeader)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/library/playlists/${created.id}`)
        .set('Authorization', authHeader)
        .expect(404);
    });

    it('rejects a playlist title that is too long with 400', async () => {
      const token = await registerAndGetToken(`playlist-validation-${Date.now()}@example.com`);

      await request(app.getHttpServer())
        .post('/library/playlists')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'x'.repeat(101) })
        .expect(400);
    });
  });

  describe('playlist ownership isolation', () => {
    it("prevents a user from reading another user's playlist (404, not 403)", async () => {
      const ownerToken = await registerAndGetToken(`owner-${Date.now()}@example.com`);
      const intruderToken = await registerAndGetToken(`intruder-${Date.now()}@example.com`);

      const createResponse = await request(app.getHttpServer())
        .post('/library/playlists')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: "Owner's Playlist" })
        .expect(201);
      const playlistId = (createResponse.body as PlaylistResponseDto).id;

      // A 404 (not 403) is deliberate: it must not be observable from the
      // response whether a playlist with this id exists at all for
      // someone else's account.
      await request(app.getHttpServer())
        .get(`/library/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${intruderToken}`)
        .expect(404);
    });

    it("prevents a user from deleting another user's playlist", async () => {
      const ownerToken = await registerAndGetToken(`owner2-${Date.now()}@example.com`);
      const intruderToken = await registerAndGetToken(`intruder2-${Date.now()}@example.com`);

      const createResponse = await request(app.getHttpServer())
        .post('/library/playlists')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: "Owner's Second Playlist" })
        .expect(201);
      const playlistId = (createResponse.body as PlaylistResponseDto).id;

      await request(app.getHttpServer())
        .delete(`/library/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${intruderToken}`)
        .expect(404);

      // Confirm it genuinely wasn't deleted.
      await request(app.getHttpServer())
        .get(`/library/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });
  });

  describe('playlist track membership', () => {
    it('adds and removes a track from a playlist', async () => {
      const token = await registerAndGetToken(`playlist-tracks-${Date.now()}@example.com`);
      const authHeader = `Bearer ${token}`;

      const createResponse = await request(app.getHttpServer())
        .post('/library/playlists')
        .set('Authorization', authHeader)
        .send({ title: 'Track Membership Playlist' })
        .expect(201);
      const playlistId = (createResponse.body as PlaylistResponseDto).id;

      const addResponse = await request(app.getHttpServer())
        .post(`/library/playlists/${playlistId}/tracks`)
        .set('Authorization', authHeader)
        .send({ trackId })
        .expect(201);
      const withTrack = addResponse.body as PlaylistWithTracksResponseDto;
      expect(withTrack.tracks).toHaveLength(1);
      expect(withTrack.tracks[0].id).toBe(trackId);

      // Adding the same track again must not duplicate it.
      await request(app.getHttpServer())
        .post(`/library/playlists/${playlistId}/tracks`)
        .set('Authorization', authHeader)
        .send({ trackId })
        .expect(201);

      const afterDuplicateAdd = await request(app.getHttpServer())
        .get(`/library/playlists/${playlistId}`)
        .set('Authorization', authHeader)
        .expect(200);
      expect((afterDuplicateAdd.body as PlaylistWithTracksResponseDto).tracks).toHaveLength(1);

      await request(app.getHttpServer())
        .delete(`/library/playlists/${playlistId}/tracks/${trackId}`)
        .set('Authorization', authHeader)
        .expect(204);

      const afterRemove = await request(app.getHttpServer())
        .get(`/library/playlists/${playlistId}`)
        .set('Authorization', authHeader)
        .expect(200);
      expect((afterRemove.body as PlaylistWithTracksResponseDto).tracks).toEqual([]);
    });
  });

  describe('saved (liked) entities', () => {
    it('saves, lists, and unsaves a liked track', async () => {
      const token = await registerAndGetToken(`saved-${Date.now()}@example.com`);
      const authHeader = `Bearer ${token}`;

      await request(app.getHttpServer())
        .post('/library/saved')
        .set('Authorization', authHeader)
        .send({ entityType: 'track', entityId: trackId })
        .expect(204);

      const listResponse = await request(app.getHttpServer())
        .get('/library/saved')
        .set('Authorization', authHeader)
        .expect(200);
      const saved = listResponse.body as LibraryEntryResponseDto[];
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ entityType: 'track', entityId: trackId });

      // Saving the same entity twice must not create a duplicate row.
      await request(app.getHttpServer())
        .post('/library/saved')
        .set('Authorization', authHeader)
        .send({ entityType: 'track', entityId: trackId })
        .expect(204);

      const afterDuplicateSave = await request(app.getHttpServer())
        .get('/library/saved')
        .set('Authorization', authHeader)
        .expect(200);
      expect(afterDuplicateSave.body).toHaveLength(1);

      await request(app.getHttpServer())
        .delete(`/library/saved/track/${trackId}`)
        .set('Authorization', authHeader)
        .expect(204);

      const afterUnsave = await request(app.getHttpServer())
        .get('/library/saved')
        .set('Authorization', authHeader)
        .expect(200);
      expect(afterUnsave.body).toEqual([]);
    });

    it('rejects an invalid entityType with 400', async () => {
      const token = await registerAndGetToken(`saved-invalid-${Date.now()}@example.com`);

      await request(app.getHttpServer())
        .post('/library/saved')
        .set('Authorization', `Bearer ${token}`)
        .send({ entityType: 'not-a-real-type', entityId: trackId })
        .expect(400);
    });
  });
});

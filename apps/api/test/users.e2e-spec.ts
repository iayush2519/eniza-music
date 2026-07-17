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
import { UsersModule } from '../src/users/users.module';

function asAuthResponse(body: unknown): AuthResponseDto {
  return body as AuthResponseDto;
}

/**
 * `GET /users/me` exists specifically so a client can rehydrate "who is
 * logged in" from a stored access token alone (e.g. mobile app cold
 * start) — covered here as its own small suite since it spans the
 * `users` and `auth` modules together.
 */
describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await createTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        UsersModule,
        AuthModule,
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
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  describe('GET /users/me', () => {
    it("returns the authenticated user's profile", async () => {
      const email = `users-me-${Date.now()}@example.com`;
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'Str0ngPass1', displayName: 'Me Test User' })
        .expect(201);
      const { accessToken } = asAuthResponse(registerResponse.body);

      const meResponse = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse.body).toMatchObject({ email, displayName: 'Me Test User', isArtist: false });
      expect((meResponse.body as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('rejects an unauthenticated request with 401', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('rejects a malformed access token with 401', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });
  });
});

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

/** Narrows a supertest response body (typed `any` by the library) to our
 * known auth response shape, keeping every assertion below fully typed. */
function asAuthResponse(body: unknown): AuthResponseDto {
  return body as AuthResponseDto;
}

/**
 * End-to-end coverage for the full HTTP auth surface, against a real
 * (embedded, in-memory) Postgres-compatible database — not a mocked
 * repository — so these tests exercise the actual SQL, constraints, and
 * Drizzle query behavior the production code depends on.
 *
 * This suite specifically covers the refresh-token rotation/replay-
 * detection behavior that a Phase 3 investigation found broken: two
 * refreshes issued within the same second previously produced a
 * byte-identical JWT (no `jti` claim), making rotation a no-op. See
 * src/auth/types/jwt-payload.type.ts for the fix and its rationale.
 */
describe('Auth (e2e)', () => {
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

  function register(
    overrides: Partial<{ email: string; password: string; displayName: string }> = {},
  ) {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: overrides.email ?? `user-${Date.now()}-${Math.random()}@example.com`,
        password: overrides.password ?? 'Str0ngPass1',
        displayName: overrides.displayName ?? 'Test User',
      });
  }

  function refresh(refreshToken: string) {
    return request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken });
  }

  describe('POST /auth/register', () => {
    it('creates a new account and returns tokens + profile', async () => {
      const email = `register-${Date.now()}@example.com`;
      const response = await register({ email }).expect(201);
      const body = asAuthResponse(response.body);

      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.refreshToken).toEqual(expect.any(String));
      expect(body.user).toMatchObject({
        email,
        displayName: 'Test User',
        isArtist: false,
      });
      expect(body.user.id).toBeDefined();
      expect((body.user as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('rejects a duplicate email with 409', async () => {
      const email = `duplicate-${Date.now()}@example.com`;
      await register({ email }).expect(201);
      await register({ email }).expect(409);
    });

    it('rejects a weak password with 400', async () => {
      await register({ password: 'weak' }).expect(400);
    });

    it('rejects an unknown field in the payload with 400', async () => {
      const email = `extra-field-${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'Str0ngPass1', displayName: 'Test', isAdmin: true })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('logs in with correct credentials', async () => {
      const email = `login-${Date.now()}@example.com`;
      const password = 'Str0ngPass1';
      await register({ email, password }).expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(201);
      const body = asAuthResponse(response.body);

      expect(body.user.email).toBe(email);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('rejects an incorrect password with 401', async () => {
      const email = `login-fail-${Date.now()}@example.com`;
      await register({ email, password: 'Str0ngPass1' }).expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'WrongPassword1' })
        .expect(401);
    });

    it('rejects an unknown email with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'Str0ngPass1' })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('issues a new token pair for a valid refresh token', async () => {
      const registerResponse = await register().expect(201);
      const { refreshToken } = asAuthResponse(registerResponse.body);

      const refreshResponse = await refresh(refreshToken).expect(201);
      const body = asAuthResponse(refreshResponse.body);

      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('supports a chain of several legitimate sequential refreshes', async () => {
      const registerResponse = await register().expect(201);
      let token = asAuthResponse(registerResponse.body).refreshToken;

      for (let i = 0; i < 4; i++) {
        const response = await refresh(token).expect(201);
        token = asAuthResponse(response.body).refreshToken;
      }
    });

    it('produces a different refresh token on every call, even within the same second', async () => {
      // Regression test for the Phase 3 finding: RefreshTokenPayload
      // previously lacked a `jti`, so two refreshes signed within the
      // same second (iat has 1-second resolution) produced a
      // byte-identical JWT, making rotation silently do nothing.
      const registerResponse = await register().expect(201);
      const originalToken = asAuthResponse(registerResponse.body).refreshToken;

      const refresh1 = await refresh(originalToken).expect(201);
      const refresh1Token = asAuthResponse(refresh1.body).refreshToken;

      const refresh2 = await refresh(refresh1Token).expect(201);
      const refresh2Token = asAuthResponse(refresh2.body).refreshToken;

      expect(refresh1Token).not.toBe(originalToken);
      expect(refresh2Token).not.toBe(refresh1Token);
    });

    it('rejects a replayed (already-rotated) refresh token with 401', async () => {
      const registerResponse = await register().expect(201);
      const originalToken = asAuthResponse(registerResponse.body).refreshToken;

      await refresh(originalToken).expect(201);

      // Replaying the same (now-stale) token must fail, not silently
      // succeed as if it were still current.
      await refresh(originalToken).expect(401);
    });

    it('revokes the session on replay detection, invalidating even the rotated token', async () => {
      const registerResponse = await register().expect(201);
      const originalToken = asAuthResponse(registerResponse.body).refreshToken;

      const rotatedResponse = await refresh(originalToken).expect(201);
      const rotatedToken = asAuthResponse(rotatedResponse.body).refreshToken;

      // Trigger replay detection.
      await refresh(originalToken).expect(401);

      // The session is now revoked outright, so even the legitimately
      // rotated token must no longer work.
      await refresh(rotatedToken).expect(401);
    });

    it('rejects a malformed refresh token with 401', async () => {
      await refresh('not-a-real-token').expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the session so its refresh token can no longer be used', async () => {
      const registerResponse = await register().expect(201);
      const { refreshToken } = asAuthResponse(registerResponse.body);

      await request(app.getHttpServer()).post('/auth/logout').send({ refreshToken }).expect(204);

      await refresh(refreshToken).expect(401);
    });
  });
});

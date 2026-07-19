import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

import { PasswordService } from './password.service';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { NewSession, Session, sessions } from '../database/schema';

/**
 * Owns the `sessions` table: creating a session on login/register,
 * validating + rotating it on refresh, and revoking it on logout. Kept as
 * its own service (rather than folded into `AuthService`) because it has a
 * distinct responsibility (session lifecycle) that a future "manage your
 * devices" feature would extend directly.
 */
@Injectable()
export class SessionsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly passwordService: PasswordService,
  ) {}

  async create(params: {
    id: string;
    userId: string;
    refreshToken: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<Session> {
    const refreshTokenHash = await this.passwordService.hash(params.refreshToken);

    const newSession: NewSession = {
      id: params.id,
      userId: params.userId,
      refreshTokenHash,
      expiresAt: params.expiresAt,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    };

    const [session] = await this.db.insert(sessions).values(newSession).returning();
    return session;
  }

  async findActiveById(sessionId: string): Promise<Session | undefined> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
      .limit(1);
    return session;
  }

  /**
   * Rotates the refresh token bound to a session: the old token's hash is
   * replaced, so replaying the previous refresh token (e.g. from a stolen
   * copy) fails on its next use. This is the concrete mechanism behind
   * "rotating refresh tokens... invalidated on rotation to limit replay
   * window" (docs/architecture/security.md).
   */
  async rotateRefreshToken(
    sessionId: string,
    newRefreshToken: string,
    newExpiresAt: Date,
  ): Promise<void> {
    const refreshTokenHash = await this.passwordService.hash(newRefreshToken);

    await this.db
      .update(sessions)
      .set({ refreshTokenHash, expiresAt: newExpiresAt })
      .where(eq(sessions.id, sessionId));
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
  }

  /**
   * Revokes every active session for a user — used after a password
   * reset (see PasswordResetService), on the standard reasoning that a
   * password change should force re-authentication on every device, not
   * just the one that performed the reset. Already-revoked sessions are
   * left untouched (the `isNull(revokedAt)` filter) rather than
   * re-written, since they carry no meaningful state to update.
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }

  async verifyRefreshToken(session: Session, presentedToken: string): Promise<boolean> {
    return this.passwordService.verify(session.refreshTokenHash, presentedToken);
  }
}

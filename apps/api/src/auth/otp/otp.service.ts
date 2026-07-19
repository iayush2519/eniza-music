import { randomInt } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { ACTIVE_OTP_DELIVERY_PROVIDER } from './otp.constants';
import type { OtpDeliveryProvider } from './otp-delivery.interface';
import { PasswordService } from '../password.service';
import { DATABASE_CONNECTION } from '../../database/database.constants';
import type { Database } from '../../database/database.module';
import { EmailOtp, emailOtps, OtpPurpose } from '../../database/schema';

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
/** Minimum time a caller must wait between resend requests for the same
 * purpose — a deliberately simple, in-DB throttle (no Redis/queue
 * dependency needed) that still prevents a resend button from spamming
 * the delivery provider on every tap. */
const RESEND_COOLDOWN_MS = 30 * 1000;

export class OtpCooldownError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super('An OTP was already sent recently; please wait before requesting another.');
  }
}

/**
 * Issues, delivers, and verifies OTP codes for both flows that need one
 * (`register` email verification and `password_reset`). Deliberately one
 * shared service for both purposes rather than two near-duplicate ones —
 * the generate/hash/store/verify mechanics are identical; only the
 * `purpose` column and the caller's post-verification action differ.
 *
 * Security model mirrors `SessionsService` exactly: the code is hashed
 * with the existing `PasswordService` (argon2) before being stored, never
 * kept in plaintext, and is single-use (`consumedAt`) plus time-limited
 * (`expiresAt`).
 */
@Injectable()
export class OtpService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly passwordService: PasswordService,
    @Inject(ACTIVE_OTP_DELIVERY_PROVIDER) private readonly deliveryProvider: OtpDeliveryProvider,
  ) {}

  /**
   * Generates a fresh code, stores its hash, and delivers it. Throws
   * `OtpCooldownError` if a code for the same user+purpose was issued
   * within `RESEND_COOLDOWN_MS` — callers (register, resend, forgot
   * password) all funnel through this one method, so the cooldown is
   * enforced in exactly one place regardless of entry point.
   */
  async issue(params: { userId: string; email: string; purpose: OtpPurpose }): Promise<void> {
    const [mostRecent] = await this.db
      .select()
      .from(emailOtps)
      .where(and(eq(emailOtps.userId, params.userId), eq(emailOtps.purpose, params.purpose)))
      .orderBy(desc(emailOtps.createdAt))
      .limit(1);

    if (mostRecent) {
      const elapsedMs = Date.now() - mostRecent.createdAt.getTime();
      if (elapsedMs < RESEND_COOLDOWN_MS) {
        throw new OtpCooldownError(RESEND_COOLDOWN_MS - elapsedMs);
      }
    }

    const code = this.generateCode();
    const codeHash = await this.passwordService.hash(code);

    await this.db.insert(emailOtps).values({
      userId: params.userId,
      purpose: params.purpose,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    await this.deliveryProvider.send({ email: params.email, code, purpose: params.purpose });
  }

  /**
   * Verifies a presented code against the most recent unconsumed,
   * unexpired OTP row for this user+purpose, and marks it consumed on
   * success. Returns whether verification succeeded rather than throwing,
   * so callers (AuthService) decide the appropriate HTTP error for their
   * own endpoint rather than this service assuming one.
   */
  async verify(params: { userId: string; purpose: OtpPurpose; code: string }): Promise<boolean> {
    const [candidate] = await this.db
      .select()
      .from(emailOtps)
      .where(
        and(
          eq(emailOtps.userId, params.userId),
          eq(emailOtps.purpose, params.purpose),
          isNull(emailOtps.consumedAt),
        ),
      )
      .orderBy(desc(emailOtps.createdAt))
      .limit(1);

    if (!candidate || candidate.expiresAt.getTime() < Date.now()) {
      return false;
    }

    const isMatch = await this.passwordService.verify(candidate.codeHash, params.code);
    if (!isMatch) {
      return false;
    }

    await this.markConsumed(candidate);
    return true;
  }

  private async markConsumed(otp: EmailOtp): Promise<void> {
    await this.db.update(emailOtps).set({ consumedAt: new Date() }).where(eq(emailOtps.id, otp.id));
  }

  private generateCode(): string {
    // randomInt (crypto, not Math.random) for a cryptographically
    // unpredictable code — the same standard this project already holds
    // password/refresh-token generation to.
    const max = 10 ** OTP_LENGTH;
    return randomInt(0, max).toString().padStart(OTP_LENGTH, '0');
  }
}

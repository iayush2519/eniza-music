import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

/**
 * The set of flows an OTP code can gate. Kept as a plain string union
 * (not a Postgres enum type) for the same reason `sessions`/`users` avoid
 * Postgres enums elsewhere in this schema — adding a new purpose later is
 * a TypeScript-only change, no migration required.
 */
export const otpPurposeValues = ['register', 'password_reset'] as const;
export type OtpPurpose = (typeof otpPurposeValues)[number];

/**
 * One row per issued OTP code. Mirrors `sessions.schema.ts`'s security
 * model exactly: `codeHash` stores an argon2 hash of the 6-digit code via
 * the existing `PasswordService`, never the plaintext code — a DB leak
 * alone does not yield usable codes.
 *
 * `consumedAt` makes a code single-use (checked alongside `expiresAt` by
 * `OtpService.verify`); a new row is issued on every send/resend rather
 * than updating one row in place, so `email_otps` also doubles as an
 * audit trail of every OTP ever issued to an account.
 */
export const emailOtps = pgTable('email_otps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  purpose: text('purpose').notNull(),
  codeHash: text('code_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
});

export type EmailOtp = typeof emailOtps.$inferSelect;
export type NewEmailOtp = typeof emailOtps.$inferInsert;

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

/**
 * Sessions table: one row per active refresh-token lineage, per device.
 *
 * This is what makes refresh-token rotation and revocation real rather than
 * stateless-JWT hand-waving (see docs/architecture/security.md: "rotating
 * refresh tokens... invalidated on rotation to limit replay window"):
 *
 * - `refreshTokenHash` stores an argon2 hash of the current refresh token,
 *   never the token itself — a DB leak alone does not yield usable tokens.
 * - On every `/auth/refresh` call, the presented token is checked against
 *   this hash, then the hash is rotated (old token becomes permanently
 *   unusable even if replayed).
 * - `revokedAt` lets `/auth/logout` (or a future "sign out of all devices"
 *   feature) kill a session immediately without waiting for expiry.
 * - `userAgent`/`ipAddress` support the "session/device tracking for
 *   revocation" requirement from docs/architecture/backend-architecture.md
 *   (a future "manage devices" screen reads this table directly).
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

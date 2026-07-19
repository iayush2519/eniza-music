import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Users table.
 *
 * Per docs/architecture/content-model.md, a user can be a listener, an
 * artist, or both — this is modeled as a role flag (`isArtist`) rather than
 * separate tables, since one account can hold both capabilities. The
 * public-facing `Artist` profile entity (name, bio, artwork) is a Phase 4
 * concern (catalog domain) and is intentionally not modeled here yet.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  isArtist: boolean('is_artist').notNull().default(false),
  // Phase 3 (Authentication): set true once the user completes email OTP
  // verification (see email-otps.schema.ts / OtpService). Registration
  // and login remain unaffected by this flag at the API layer — a new
  // account can still authenticate immediately after registering; the
  // mobile app gates entry into the main app behind this flag itself
  // (see apps/mobile/src/app/_layout.tsx's Stack.Protected guards),
  // rather than the backend rejecting unverified sessions outright.
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

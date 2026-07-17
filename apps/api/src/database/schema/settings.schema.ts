import { boolean, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

/**
 * A user's preferences — one row per user, created lazily on first read
 * (by the future `settings` module) rather than at registration time.
 * Preferences were explicitly deferred in
 * docs/architecture/backend-architecture.md ("Preferences are not yet
 * modeled — deferred until a feature actually needs them") until the
 * provider pivot's recommendations/playback work gave them a concrete
 * use. Kept intentionally minimal; grows as real settings screens are
 * built rather than speculatively up front.
 */
export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  explicitContentEnabled: boolean('explicit_content_enabled').notNull().default(true),
  autoplayEnabled: boolean('autoplay_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;

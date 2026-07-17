import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

/**
 * Public-facing artist profile, linked 1:1 to a `User` with `isArtist =
 * true`. Kept as its own table (not just fields on `users`) because an
 * artist profile has its own public identity (name, bio, avatar) that is
 * conceptually distinct from account/auth data — per
 * docs/architecture/content-model.md: "Artist — public-facing profile
 * linked to a User."
 */
export const artists = pgTable('artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  name: text('name').notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;

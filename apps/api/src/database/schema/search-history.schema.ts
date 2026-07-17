import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

/**
 * One row per search request a user makes, per
 * docs/architecture/music-provider-architecture.md's search architecture.
 * Read by a future "recent searches" mobile affordance and by the
 * `recommendations` module (a later milestone) as one of the primary
 * behavioral signals — per
 * docs/decisions/0007-provider-backed-music-catalog.md, recommendations
 * are driven primarily by our own user-behavior data, not provider data.
 *
 * `resultCount` is stored (not recomputed later) so recommendation
 * scoring can distinguish "searched for X and found nothing" from
 * "searched for X and got results but didn't click one" without re-
 * querying the provider.
 */
export const searchHistory = pgTable('search_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  resultCount: integer('result_count').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SearchHistory = typeof searchHistory.$inferSelect;
export type NewSearchHistory = typeof searchHistory.$inferInsert;

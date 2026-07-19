import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, isNotNull } from 'drizzle-orm';

import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { Album, albums } from '../database/schema';

const NEW_RELEASES_MAX_LIMIT = 50;

/**
 * Per docs/decisions/0007-provider-backed-music-catalog.md, `findAll`
 * (unbounded "every album" listing) and `create` were removed as part of
 * Milestone 12's cleanup — see catalog.controller.ts for the full
 * rationale. `MusicGateway` is the only writer of cache rows now.
 */
@Injectable()
export class AlbumsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findById(id: string): Promise<Album | undefined> {
    const [album] = await this.db.select().from(albums).where(eq(albums.id, id)).limit(1);
    return album;
  }

  async findByArtistId(artistId: string): Promise<Album[]> {
    return this.db
      .select()
      .from(albums)
      .where(eq(albums.artistId, artistId))
      .orderBy(albums.releasedAt);
  }

  /**
   * "New Releases" for Home — a bounded, offset-paginated query over the
   * *local* metadata cache, explicitly not a live call to the active
   * `MusicProvider`. This deliberately does not reopen the "browse the
   * whole catalog" surface that ADR 0007/Milestone 12 retired: every
   * page is capped (`NEW_RELEASES_MAX_LIMIT`), ordered by a column that
   * already exists (`releasedAt`), and — like every other cache read in
   * this app — will be sparse for a fresh install until the cache has
   * been populated by real search/playback activity (see
   * `MusicGateway`'s cache-fills-itself-from-traffic design). That's the
   * same graceful degradation `RecommendationsService`'s sections
   * already rely on, not a new failure mode this endpoint introduces.
   *
   * Pagination is a simple `limit`/`offset` pair, not a cursor — this is
   * the first paginated endpoint in the app, and offset pagination over
   * a single `ORDER BY releasedAt DESC` is simple and correct at this
   * scale; a cursor-based scheme would be added if/when this cache grows
   * large enough for offset drift (rows shifting between pages as new
   * albums are cached) to become a real, observed problem.
   */
  async findNewReleases(limit: number, offset: number): Promise<Album[]> {
    const boundedLimit = Math.min(Math.max(limit, 1), NEW_RELEASES_MAX_LIMIT);
    return this.db
      .select()
      .from(albums)
      .where(isNotNull(albums.releasedAt))
      .orderBy(desc(albums.releasedAt))
      .limit(boundedLimit)
      .offset(Math.max(offset, 0));
  }
}

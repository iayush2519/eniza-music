import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { Track, tracks } from '../database/schema';

/**
 * Per docs/decisions/0007-provider-backed-music-catalog.md, `findAll`
 * (unbounded "every track" listing) and `searchByTitle` (superseded by
 * `discovery/search.controller.ts`'s `/search`, which searches the
 * provider, not just whatever happens to already be cached) were removed
 * as part of Milestone 12's cleanup — see catalog.controller.ts for the
 * full rationale. `create` was also removed: nothing calls it —
 * `MusicGateway` is the only writer of cache rows now (see
 * music-gateway.service.ts), and the seed script populates the cache
 * through the Gateway rather than inserting rows directly.
 */
@Injectable()
export class TracksService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findById(id: string): Promise<Track | undefined> {
    const [track] = await this.db.select().from(tracks).where(eq(tracks.id, id)).limit(1);
    return track;
  }

  async findByArtistId(artistId: string): Promise<Track[]> {
    return this.db
      .select()
      .from(tracks)
      .where(eq(tracks.artistId, artistId))
      .orderBy(tracks.trackNumber);
  }

  async findByAlbumId(albumId: string): Promise<Track[]> {
    return this.db
      .select()
      .from(tracks)
      .where(eq(tracks.albumId, albumId))
      .orderBy(tracks.trackNumber);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { Album, albums } from '../database/schema';

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
}

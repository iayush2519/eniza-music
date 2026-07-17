import { Inject, Injectable } from '@nestjs/common';
import { eq, ilike } from 'drizzle-orm';

import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { NewTrack, Track, tracks } from '../database/schema';

@Injectable()
export class TracksService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findAll(): Promise<Track[]> {
    return this.db.select().from(tracks).orderBy(tracks.createdAt);
  }

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

  /**
   * Case-insensitive substring match on title. Deliberately simple for
   * Phase 4 — full-text search/ranking is a later optimization once
   * there's a realistic catalog size to tune against, not a day-one
   * requirement.
   */
  async searchByTitle(query: string): Promise<Track[]> {
    return this.db
      .select()
      .from(tracks)
      .where(ilike(tracks.title, `%${query}%`));
  }

  async create(newTrack: NewTrack): Promise<Track> {
    const [track] = await this.db.insert(tracks).values(newTrack).returning();
    return track;
  }
}

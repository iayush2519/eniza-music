import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { Album, albums, NewAlbum } from '../database/schema';

@Injectable()
export class AlbumsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findAll(): Promise<Album[]> {
    return this.db.select().from(albums).orderBy(albums.releasedAt);
  }

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

  async create(newAlbum: NewAlbum): Promise<Album> {
    const [album] = await this.db.insert(albums).values(newAlbum).returning();
    return album;
  }
}

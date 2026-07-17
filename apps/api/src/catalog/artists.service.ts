import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { Artist, artists, NewArtist } from '../database/schema';

@Injectable()
export class ArtistsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findAll(): Promise<Artist[]> {
    return this.db.select().from(artists).orderBy(artists.name);
  }

  async findById(id: string): Promise<Artist | undefined> {
    const [artist] = await this.db.select().from(artists).where(eq(artists.id, id)).limit(1);
    return artist;
  }

  async findByUserId(userId: string): Promise<Artist | undefined> {
    const [artist] = await this.db
      .select()
      .from(artists)
      .where(eq(artists.userId, userId))
      .limit(1);
    return artist;
  }

  async create(newArtist: NewArtist): Promise<Artist> {
    const [artist] = await this.db.insert(artists).values(newArtist).returning();
    return artist;
  }
}

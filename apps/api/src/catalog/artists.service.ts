import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { artists, Artist } from '../database/schema';

/**
 * `findAll` (list every cached artist) is kept — see
 * catalog.controller.ts's docstring for why this one list route survived
 * Milestone 12's cleanup while the track/album equivalents did not.
 * `create` and `findByUserId` were removed: both modeled artists as our
 * own uploading users (`artists.userId`), which no longer applies per
 * docs/decisions/0007-provider-backed-music-catalog.md — `MusicGateway`
 * is the only writer of cache rows now, and nothing links a cached
 * artist back to one of our accounts.
 */
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
}

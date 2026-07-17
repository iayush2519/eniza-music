import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { NewPlaylist, Playlist, playlists } from '../database/schema';

@Injectable()
export class PlaylistsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findAllForUser(userId: string): Promise<Playlist[]> {
    return this.db
      .select()
      .from(playlists)
      .where(eq(playlists.userId, userId))
      .orderBy(playlists.createdAt);
  }

  async findById(id: string): Promise<Playlist | undefined> {
    const [playlist] = await this.db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
    return playlist;
  }

  /** Scoped lookup used to enforce ownership before a mutation proceeds. */
  async findByIdForUser(id: string, userId: string): Promise<Playlist | undefined> {
    const [playlist] = await this.db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, id), eq(playlists.userId, userId)))
      .limit(1);
    return playlist;
  }

  async create(newPlaylist: NewPlaylist): Promise<Playlist> {
    const [playlist] = await this.db.insert(playlists).values(newPlaylist).returning();
    return playlist;
  }

  async update(
    id: string,
    changes: Partial<Pick<Playlist, 'title' | 'description'>>,
  ): Promise<Playlist> {
    const [playlist] = await this.db
      .update(playlists)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(playlists.id, id))
      .returning();
    return playlist;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(playlists).where(eq(playlists.id, id));
  }
}

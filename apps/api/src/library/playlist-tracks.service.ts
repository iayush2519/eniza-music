import { Inject, Injectable } from '@nestjs/common';
import { and, eq, max } from 'drizzle-orm';

import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { PlaylistTrack, playlistTracks, Track, tracks } from '../database/schema';

@Injectable()
export class PlaylistTracksService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  /** Returns the playlist's tracks in position order. */
  async findTracksForPlaylist(playlistId: string): Promise<Track[]> {
    const rows = await this.db
      .select({ track: tracks })
      .from(playlistTracks)
      .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
      .where(eq(playlistTracks.playlistId, playlistId))
      .orderBy(playlistTracks.position);

    return rows.map((row) => row.track);
  }

  async isTrackInPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: playlistTracks.id })
      .from(playlistTracks)
      .where(and(eq(playlistTracks.playlistId, playlistId), eq(playlistTracks.trackId, trackId)))
      .limit(1);
    return Boolean(row);
  }

  /** Appends a track at the end of the playlist. */
  async addTrack(playlistId: string, trackId: string): Promise<PlaylistTrack> {
    const [{ maxPosition }] = await this.db
      .select({ maxPosition: max(playlistTracks.position) })
      .from(playlistTracks)
      .where(eq(playlistTracks.playlistId, playlistId));

    const nextPosition = (maxPosition ?? -1) + 1;

    const [row] = await this.db
      .insert(playlistTracks)
      .values({ playlistId, trackId, position: nextPosition })
      .returning();
    return row;
  }

  async removeTrack(playlistId: string, trackId: string): Promise<void> {
    await this.db
      .delete(playlistTracks)
      .where(and(eq(playlistTracks.playlistId, playlistId), eq(playlistTracks.trackId, trackId)));
  }
}

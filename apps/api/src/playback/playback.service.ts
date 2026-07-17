import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { MusicGateway } from '../discovery/music-gateway.service';
import type { ResolvedStream } from '../discovery/providers/music-provider.interface';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { listeningHistory } from '../database/schema';

/**
 * Backs `GET /playback/resolve/:trackId`. Delegates stream-URL
 * resolution to `MusicGateway` (which itself delegates to whichever
 * `MusicProvider` is active) and adds the one piece of behavior that's
 * specific to a *playback request* rather than an arbitrary Gateway
 * lookup: recording a `listening_history` row, per
 * docs/architecture/music-provider-architecture.md's playback
 * architecture. Mirrors `SearchService`'s split between "ask the Gateway"
 * and "record history for this user" exactly.
 */
@Injectable()
export class PlaybackService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly musicGateway: MusicGateway,
  ) {}

  async resolveStreamUrl(userId: string, trackId: string): Promise<ResolvedStream> {
    const track = await this.musicGateway.getTrack(trackId);
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    const stream = await this.musicGateway.resolveStreamUrl(trackId);

    // Fire-and-forget: recording history should never slow down or fail
    // the playback response the user is waiting on. Explicitly caught
    // (not just `void`-ignored) so a write failure becomes a logged
    // warning, not an unhandled promise rejection — same pattern as
    // SearchService.recordSearch.
    this.recordPlay(userId, trackId).catch((error: unknown) => {
      console.error('PlaybackService: failed to record listening history', error);
    });

    return stream;
  }

  private async recordPlay(userId: string, trackId: string): Promise<void> {
    await this.db.insert(listeningHistory).values({ userId, trackId });
  }
}

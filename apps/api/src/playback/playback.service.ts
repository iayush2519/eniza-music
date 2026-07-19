import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { ReportProgressDto } from './dto/report-progress.dto';
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

  /**
   * Updates the most recent `listening_history` row for this
   * user+track — the one `resolveStreamUrl` created for the playback
   * session currently in progress — with how far the mobile player has
   * gotten, per this table's own doc comment
   * ("durationListenedSeconds/completed/skipped are updated as playback
   * progresses"), which described this exact behavior before any caller
   * of it existed. Called by the mobile playback store on pause, on
   * skip/track-change, and periodically during playback (see
   * apps/mobile/src/stores/playback-store.ts) — not on every position
   * tick, to avoid writing on every animation frame.
   *
   * If no row exists yet for this user+track (a client bug, or a call
   * that races ahead of `resolveStreamUrl`'s own fire-and-forget insert),
   * this is a silent no-op rather than an error — progress reporting is
   * a best-effort enrichment of history that already exists, not a
   * source of truth for whether a track was ever played at all.
   */
  async reportProgress(userId: string, dto: ReportProgressDto): Promise<void> {
    const [mostRecent] = await this.db
      .select({ id: listeningHistory.id })
      .from(listeningHistory)
      .where(and(eq(listeningHistory.userId, userId), eq(listeningHistory.trackId, dto.trackId)))
      .orderBy(desc(listeningHistory.playedAt))
      .limit(1);

    if (!mostRecent) {
      return;
    }

    await this.db
      .update(listeningHistory)
      .set({
        durationListenedSeconds: dto.positionSeconds,
        ...(dto.completed !== undefined ? { completed: dto.completed } : {}),
        ...(dto.skipped !== undefined ? { skipped: dto.skipped } : {}),
      })
      .where(eq(listeningHistory.id, mostRecent.id));
  }
}

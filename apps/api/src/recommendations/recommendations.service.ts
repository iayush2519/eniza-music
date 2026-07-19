import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, isNotNull, lt, sql } from 'drizzle-orm';

import { MusicGateway } from '../discovery/music-gateway.service';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { libraryEntries, listeningHistory, Track, tracks } from '../database/schema';

export interface RecommendationSectionResult {
  id: string;
  title: string;
  tracks: Track[];
}

const RECENTLY_PLAYED_LIMIT = 10;
const FOR_YOU_LIMIT = 10;
const BECAUSE_YOU_LIKED_LIMIT = 10;
const CONTINUE_LISTENING_LIMIT = 10;
const TRENDING_LIMIT = 10;
/** A track only counts as "in progress" if it's been listened to for at
 * least this long — a few seconds of `durationListenedSeconds` (e.g. a
 * near-instant skip that happened to report progress once before the
 * skip) shouldn't surface as something worth resuming. */
const CONTINUE_LISTENING_MIN_SECONDS = 15;
/** How far back "Trending Now" looks — a global, cross-user aggregate
 * over recent plays, not all-time, so the section reflects current
 * activity rather than being dominated by whatever was played most in
 * the app's early (near-empty) history. */
const TRENDING_WINDOW_DAYS = 30;

/**
 * Backs `GET /recommendations`, the personalized landing page for Home —
 * per docs/decisions/0007-provider-backed-music-catalog.md,
 * recommendations are driven **primarily by our own user-behavior data**
 * (listening history, likes, playlists, searches), with provider-side
 * "related tracks" as an optional, secondary enrichment signal, never a
 * required dependency.
 *
 * Three sections, each independently omitted (not returned as an empty
 * placeholder) when there isn't enough data to populate it — a brand new
 * user with no history sees an empty section list rather than an error or
 * a wall of empty sections:
 *
 * 1. **Recently played** — purely `listening_history`, no other input.
 * 2. **For you** — the user's most-listened-to artist (derived from
 *    `listening_history`), then other tracks by that artist already
 *    sitting in the local metadata cache — no provider call.
 * 3. **Because you liked "X"** — the user's most recently liked track
 *    (`library_entries`), enriched via `MusicGateway.getRelatedTracks`.
 *    This is the one section that touches the provider, and it degrades
 *    gracefully: `getRelatedTracks` already returns `[]` rather than
 *    throwing when the active provider doesn't support it (see
 *    music-gateway.service.ts), so this section simply doesn't appear in
 *    that case instead of failing the whole request.
 */
@Injectable()
export class RecommendationsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly musicGateway: MusicGateway,
  ) {}

  async getSections(userId: string): Promise<RecommendationSectionResult[]> {
    const sections: RecommendationSectionResult[] = [];

    // Ordered most-actionable-and-personal first, least-personal last:
    // resuming something you already started, then what you've played,
    // then a personalized pick, then an enrichment-based pick, then a
    // global (not user-specific) signal any user — including a brand
    // new one with no history — can see something in.
    const continueListening = await this.getContinueListening(userId);
    if (continueListening) {
      sections.push(continueListening);
    }

    const recentlyPlayed = await this.getRecentlyPlayed(userId);
    if (recentlyPlayed.length > 0) {
      sections.push({ id: 'recently-played', title: 'Recently played', tracks: recentlyPlayed });
    }

    const forYou = await this.getForYou(userId, recentlyPlayed);
    if (forYou) {
      sections.push(forYou);
    }

    const becauseYouLiked = await this.getBecauseYouLiked(userId);
    if (becauseYouLiked) {
      sections.push(becauseYouLiked);
    }

    const trending = await this.getTrending();
    if (trending) {
      sections.push(trending);
    }

    return sections;
  }

  /**
   * "Continue Listening": tracks this user started but neither finished
   * nor skipped, most-recently-played first. Reads exactly the columns
   * `POST /playback/progress` writes (see playback.service.ts's
   * `reportProgress`) — `recordPlay` (called on every stream resolution)
   * never sets `durationListenedSeconds` itself, so a row only becomes
   * eligible for this section once the mobile player has actually
   * reported progress against it. Until a client calls that endpoint for
   * a given play, this section is simply omitted for it — the same
   * graceful "not enough data yet" degradation every section in this
   * service already follows, not a special case.
   */
  private async getContinueListening(userId: string): Promise<RecommendationSectionResult | null> {
    const rows = await this.db
      .select({ track: tracks, playedAt: listeningHistory.playedAt })
      .from(listeningHistory)
      .innerJoin(tracks, eq(listeningHistory.trackId, tracks.id))
      .where(
        and(
          eq(listeningHistory.userId, userId),
          eq(listeningHistory.completed, false),
          eq(listeningHistory.skipped, false),
          isNotNull(listeningHistory.durationListenedSeconds),
          gte(listeningHistory.durationListenedSeconds, CONTINUE_LISTENING_MIN_SECONDS),
          lt(listeningHistory.durationListenedSeconds, tracks.durationSeconds),
        ),
      )
      .orderBy(desc(listeningHistory.playedAt));

    const seen = new Set<string>();
    const distinct: Track[] = [];
    for (const row of rows) {
      if (seen.has(row.track.id)) {
        continue;
      }
      seen.add(row.track.id);
      distinct.push(row.track);
      if (distinct.length >= CONTINUE_LISTENING_LIMIT) {
        break;
      }
    }

    return distinct.length > 0
      ? { id: 'continue-listening', title: 'Continue listening', tracks: distinct }
      : null;
  }

  /**
   * "Trending Now": the most-played tracks across *all* users in the
   * last `TRENDING_WINDOW_DAYS` days — the one section here that is not
   * personalized (per docs/decisions/0007-provider-backed-music-catalog.md,
   * this app's recommendations are otherwise entirely user-behavior
   * driven, but "what's popular right now" is inherently a cross-user
   * signal, not a substitute for the personalized sections above it).
   * Shown to every user, including one with zero history of their own,
   * so Home never has literally nothing to show a brand-new account.
   */
  private async getTrending(): Promise<RecommendationSectionResult | null> {
    const windowStart = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const playCounts = await this.db
      .select({
        trackId: listeningHistory.trackId,
        playCount: sql<number>`count(*)`.as('play_count'),
      })
      .from(listeningHistory)
      .where(gte(listeningHistory.playedAt, windowStart))
      .groupBy(listeningHistory.trackId)
      .orderBy(desc(sql`play_count`))
      .limit(TRENDING_LIMIT);

    if (playCounts.length === 0) {
      return null;
    }

    const trendingTracks = await Promise.all(
      playCounts.map(({ trackId }) => this.musicGateway.getTrack(trackId)),
    );
    const resolved = trendingTracks.filter((track): track is Track => track !== undefined);

    return resolved.length > 0 ? { id: 'trending', title: 'Trending now', tracks: resolved } : null;
  }

  private async getRecentlyPlayed(userId: string): Promise<Track[]> {
    const rows = await this.db
      .select({ track: tracks })
      .from(listeningHistory)
      .innerJoin(tracks, eq(listeningHistory.trackId, tracks.id))
      .where(eq(listeningHistory.userId, userId))
      .orderBy(desc(listeningHistory.playedAt));

    // The same track can appear multiple times in history (replayed) —
    // dedupe in application code, keeping the most recent occurrence,
    // rather than relying on a DB-side DISTINCT that would need its own
    // "most recent per track" subquery for no real benefit at this scale.
    const seen = new Set<string>();
    const distinct: Track[] = [];
    for (const row of rows) {
      if (seen.has(row.track.id)) {
        continue;
      }
      seen.add(row.track.id);
      distinct.push(row.track);
      if (distinct.length >= RECENTLY_PLAYED_LIMIT) {
        break;
      }
    }
    return distinct;
  }

  private async getForYou(
    userId: string,
    excludeTracks: Track[],
  ): Promise<RecommendationSectionResult | null> {
    const artistPlays = await this.db
      .select({ artistId: tracks.artistId })
      .from(listeningHistory)
      .innerJoin(tracks, eq(listeningHistory.trackId, tracks.id))
      .where(eq(listeningHistory.userId, userId));

    if (artistPlays.length === 0) {
      return null;
    }

    const playCountByArtist = new Map<string, number>();
    for (const { artistId } of artistPlays) {
      playCountByArtist.set(artistId, (playCountByArtist.get(artistId) ?? 0) + 1);
    }
    const [topArtistId] = [...playCountByArtist.entries()].sort((a, b) => b[1] - a[1])[0];

    const excludeIds = new Set(excludeTracks.map((track) => track.id));
    const candidates = await this.db
      .select()
      .from(tracks)
      .where(eq(tracks.artistId, topArtistId))
      .orderBy(desc(tracks.lastRefreshedAt))
      .limit(FOR_YOU_LIMIT + excludeIds.size);

    const filtered = candidates
      .filter((track) => !excludeIds.has(track.id))
      .slice(0, FOR_YOU_LIMIT);

    return filtered.length > 0 ? { id: 'for-you', title: 'For you', tracks: filtered } : null;
  }

  private async getBecauseYouLiked(userId: string): Promise<RecommendationSectionResult | null> {
    const [likedEntry] = await this.db
      .select()
      .from(libraryEntries)
      .where(and(eq(libraryEntries.userId, userId), eq(libraryEntries.entityType, 'track')))
      .orderBy(desc(libraryEntries.createdAt))
      .limit(1);

    if (!likedEntry) {
      return null;
    }

    const likedTrack = await this.musicGateway.getTrack(likedEntry.entityId);
    if (!likedTrack) {
      return null;
    }

    const related = await this.musicGateway.getRelatedTracks(likedTrack.id);
    if (related.length === 0) {
      return null;
    }

    return {
      id: `because-you-liked-${likedTrack.id}`,
      title: `Because you liked "${likedTrack.title}"`,
      tracks: related.slice(0, BECAUSE_YOU_LIKED_LIMIT),
    };
  }
}

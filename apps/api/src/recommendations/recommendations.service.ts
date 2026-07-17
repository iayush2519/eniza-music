import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

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

    return sections;
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

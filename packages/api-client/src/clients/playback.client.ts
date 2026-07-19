import { ReportProgressRequest, ResolvedStream } from '@music-app/shared-types';

import { HttpClient } from '../http-client';

/**
 * Resolves a playable stream URL for a track — the last step of the
 * product's primary flow ("Open App → Home ⇄ Search → Results → Tap
 * Track → Immediate Playback", per
 * docs/architecture/music-provider-architecture.md). Like `SearchClient`,
 * `/playback/resolve/:trackId` requires an authenticated user (every
 * resolution writes a `listening_history` row scoped to the requester),
 * so this client does not pass `skipAuth`.
 *
 * `trackId` is the local metadata cache id — the same id playlists,
 * library entries, and search results all use (see
 * apps/api/src/playback/playback.controller.ts) — not a raw provider id.
 */
export class PlaybackClient {
  constructor(private readonly http: HttpClient) {}

  resolveStreamUrl(trackId: string): Promise<ResolvedStream> {
    return this.http.request(`/playback/resolve/${trackId}`);
  }

  /** Reports playback position for the currently (or just-)played
   * track — the write side of Home's "Continue Listening" section (see
   * apps/api/src/recommendations/recommendations.service.ts's
   * `getContinueListening`). Fire-and-forget from the caller's
   * perspective is a UI-layer decision, not this client's — it simply
   * returns the request promise. */
  reportProgress(request: ReportProgressRequest): Promise<void> {
    return this.http.request('/playback/progress', { method: 'POST', body: request });
  }
}

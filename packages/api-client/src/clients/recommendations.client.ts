import { RecommendationSection } from '@music-app/shared-types';

import { HttpClient } from '../http-client';

/**
 * Backs the personalized Home feed — per
 * docs/architecture/music-provider-architecture.md, Home stays the
 * personalized landing page (recommendations, recently played, your
 * playlists), not replaced by Search. Like `SearchClient`/
 * `PlaybackClient`, `/recommendations` requires an authenticated user
 * (every section is computed from the requester's own listening/library
 * history), so this client does not pass `skipAuth`.
 */
export class RecommendationsClient {
  constructor(private readonly http: HttpClient) {}

  getSections(): Promise<RecommendationSection[]> {
    return this.http.request('/recommendations');
  }
}

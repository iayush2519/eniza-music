import { Album, Artist, Track } from '@music-app/shared-types';

import { HttpClient } from '../http-client';

export type SearchEntityType = 'track' | 'album' | 'artist';

export type SearchResult = {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
};

/**
 * The primary discovery entry point — per
 * docs/architecture/music-provider-architecture.md's product flow
 * ("Open App → Home ⇄ Search → Results → Tap Track → Immediate
 * Playback"). Unlike the old `CatalogClient`'s public browse methods,
 * `/search` requires an authenticated user (every search writes a
 * `search_history` row scoped to the requester), so this client does
 * not pass `skipAuth` — `HttpClient` attaches the access token as usual.
 */
export class SearchClient {
  constructor(private readonly http: HttpClient) {}

  search(query: string, type?: SearchEntityType): Promise<SearchResult> {
    return this.http.request('/search', { query: { q: query, type } });
  }
}

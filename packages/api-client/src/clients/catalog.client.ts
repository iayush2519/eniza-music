import { Album, Artist, Track } from '@music-app/shared-types';

import { HttpClient } from '../http-client';

/**
 * All catalog reads use `skipAuth: true` — per
 * docs/architecture/content-model.md, catalog browsing is public and
 * never requires a signed-in user, so these calls should never trigger
 * the refresh-on-401 machinery in `HttpClient`.
 */
export class CatalogClient {
  constructor(private readonly http: HttpClient) {}

  getTrack(id: string): Promise<Track> {
    return this.http.request(`/catalog/tracks/${id}`, { skipAuth: true });
  }

  listAlbums(): Promise<Album[]> {
    return this.http.request('/catalog/albums', { skipAuth: true });
  }

  getAlbum(id: string): Promise<Album> {
    return this.http.request(`/catalog/albums/${id}`, { skipAuth: true });
  }

  getAlbumTracks(id: string): Promise<Track[]> {
    return this.http.request(`/catalog/albums/${id}/tracks`, { skipAuth: true });
  }

  listArtists(): Promise<Artist[]> {
    return this.http.request('/catalog/artists', { skipAuth: true });
  }

  getArtist(id: string): Promise<Artist> {
    return this.http.request(`/catalog/artists/${id}`, { skipAuth: true });
  }

  getArtistAlbums(id: string): Promise<Album[]> {
    return this.http.request(`/catalog/artists/${id}/albums`, { skipAuth: true });
  }

  getArtistTracks(id: string): Promise<Track[]> {
    return this.http.request(`/catalog/artists/${id}/tracks`, { skipAuth: true });
  }
}

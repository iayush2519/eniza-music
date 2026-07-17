import {
  AddPlaylistTrackRequest,
  CreatePlaylistRequest,
  LibraryEntityType,
  LibraryEntry,
  Playlist,
  PlaylistWithTracks,
  SaveLibraryEntryRequest,
  UpdatePlaylistRequest,
} from '@music-app/shared-types';

import { HttpClient } from '../http-client';

/** Every method requires an authenticated user; `HttpClient` attaches the
 * access token automatically (no `skipAuth` here, unlike `CatalogClient`). */
export class LibraryClient {
  constructor(private readonly http: HttpClient) {}

  listPlaylists(): Promise<Playlist[]> {
    return this.http.request('/library/playlists');
  }

  createPlaylist(request: CreatePlaylistRequest): Promise<Playlist> {
    return this.http.request('/library/playlists', { method: 'POST', body: request });
  }

  getPlaylist(id: string): Promise<PlaylistWithTracks> {
    return this.http.request(`/library/playlists/${id}`);
  }

  updatePlaylist(id: string, request: UpdatePlaylistRequest): Promise<Playlist> {
    return this.http.request(`/library/playlists/${id}`, { method: 'PATCH', body: request });
  }

  deletePlaylist(id: string): Promise<void> {
    return this.http.request(`/library/playlists/${id}`, { method: 'DELETE' });
  }

  addTrackToPlaylist(playlistId: string, request: AddPlaylistTrackRequest): Promise<PlaylistWithTracks> {
    return this.http.request(`/library/playlists/${playlistId}/tracks`, { method: 'POST', body: request });
  }

  removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    return this.http.request(`/library/playlists/${playlistId}/tracks/${trackId}`, { method: 'DELETE' });
  }

  listSaved(entityType?: LibraryEntityType): Promise<LibraryEntry[]> {
    return this.http.request('/library/saved', { query: { entityType } });
  }

  save(request: SaveLibraryEntryRequest): Promise<void> {
    return this.http.request('/library/saved', { method: 'POST', body: request });
  }

  unsave(entityType: LibraryEntityType, entityId: string): Promise<void> {
    return this.http.request(`/library/saved/${entityType}/${entityId}`, { method: 'DELETE' });
  }
}

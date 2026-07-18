import type { Album, Artist } from '@music-app/shared-types';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

/**
 * Saved albums for the signed-in user: `LibraryEntry` only carries an
 * `entityId` (see @music-app/shared-types), not the denormalized album
 * itself, so this composes `LibraryClient.listSaved('album')` with one
 * `CatalogClient.getAlbum` per entry — there is no batch-fetch-by-ids
 * catalog endpoint (see apps/api/src/catalog/catalog.controller.ts), so
 * this is the correct shape given the existing API surface, not a
 * workaround. Used by Library's Albums segment.
 */
export function useSavedAlbums() {
  return useQuery({
    queryKey: ['library', 'saved', 'album'],
    queryFn: async (): Promise<Album[]> => {
      const entries = await apiClient.library.listSaved('album');
      return Promise.all(entries.map((entry) => apiClient.catalog.getAlbum(entry.entityId)));
    },
  });
}

/** Saved artists for the signed-in user — the artist equivalent of
 * `useSavedAlbums`, used by Library's Artists segment. */
export function useSavedArtists() {
  return useQuery({
    queryKey: ['library', 'saved', 'artist'],
    queryFn: async (): Promise<Artist[]> => {
      const entries = await apiClient.library.listSaved('artist');
      return Promise.all(entries.map((entry) => apiClient.catalog.getArtist(entry.entityId)));
    },
  });
}

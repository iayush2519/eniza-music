import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Album } from '@music-app/shared-types';

import { apiClient } from '@/lib/api-client';
import { useSavedAlbums } from './use-saved-entities';

/**
 * Whether a given album id is in the signed-in user's saved set — the
 * "Save" interaction Album Detail's `ContextActions` row needs per
 * docs/design/design-system-specification.md's Screen Architecture
 * ("PlaybackButtons -> ContextActions"), and per the Asset Inventory's
 * Heart/HeartFill icons being named as essential app-wide iconography.
 * This was a real gap: Library's Albums segment already reads from
 * `useSavedAlbums` (see use-saved-entities.ts), but until now nothing in
 * the app ever called `save({ entityType: 'album', ... })` — an album
 * could never actually be added to that list. Deliberately reuses
 * `useSavedAlbums` (same reasoning as `useIsArtistFollowed` reusing
 * `useSavedArtists`) rather than a second query writing an incompatible
 * shape to the same `['library', 'saved', 'album']` cache key.
 */
export function useIsAlbumSaved(albumId: string | undefined): boolean {
  const savedAlbumsQuery = useSavedAlbums();
  return Boolean(albumId && savedAlbumsQuery.data?.some((album) => album.id === albumId));
}

/** Saves/unsaves an album, with the same optimistic-update shape
 * `useToggleSavedArtist` establishes for the equivalent artist action —
 * instant feedback on the save icon rather than waiting for the
 * round-trip. Mutates the exact `Album[]` shape `useSavedAlbums` caches,
 * so both hooks stay consistent through one shared query key. */
export function useToggleSavedAlbum() {
  const queryClient = useQueryClient();
  const queryKey = ['library', 'saved', 'album'];

  return useMutation({
    mutationFn: async ({ album, isSaved }: { album: Album; isSaved: boolean }) => {
      if (isSaved) {
        await apiClient.library.unsave('album', album.id);
      } else {
        await apiClient.library.save({ entityType: 'album', entityId: album.id });
      }
    },
    onMutate: async ({ album, isSaved }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Album[]>(queryKey);

      queryClient.setQueryData<Album[]>(queryKey, (current = []) =>
        isSaved ? current.filter((saved) => saved.id !== album.id) : [...current, album],
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}

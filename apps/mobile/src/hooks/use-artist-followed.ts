import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Artist } from '@music-app/shared-types';

import { apiClient } from '@/lib/api-client';
import { useSavedArtists } from './use-saved-entities';

/**
 * Whether a given artist id is in the signed-in user's followed set —
 * "Follow" is this app's save/like interaction for an artist, the same
 * underlying `LibraryEntry` mechanism `useTrackLiked` uses for tracks.
 * Deliberately reuses `useSavedArtists` (see use-saved-entities.ts,
 * already consumed by Library's Artists segment) rather than a second,
 * differently-shaped query under the same `['library', 'saved',
 * 'artist']` cache key — two query functions writing incompatible shapes
 * to one key would corrupt whichever screen reads it second.
 */
export function useIsArtistFollowed(artistId: string): boolean {
  const savedArtistsQuery = useSavedArtists();
  return savedArtistsQuery.data?.some((artist) => artist.id === artistId) ?? false;
}

/** Follows/unfollows an artist, with the same optimistic-update shape
 * `useTrackLiked` establishes — instant feedback on the follow icon
 * rather than waiting for the round-trip. Mutates the exact `Artist[]`
 * shape `useSavedArtists` caches, so both hooks stay consistent through
 * one shared query key. */
export function useToggleSavedArtist() {
  const queryClient = useQueryClient();
  const queryKey = ['library', 'saved', 'artist'];

  return useMutation({
    mutationFn: async ({ artist, isFollowed }: { artist: Artist; isFollowed: boolean }) => {
      if (isFollowed) {
        await apiClient.library.unsave('artist', artist.id);
      } else {
        await apiClient.library.save({ entityType: 'artist', entityId: artist.id });
      }
    },
    onMutate: async ({ artist, isFollowed }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Artist[]>(queryKey);

      queryClient.setQueryData<Artist[]>(queryKey, (current = []) =>
        isFollowed ? current.filter((saved) => saved.id !== artist.id) : [...current, artist],
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

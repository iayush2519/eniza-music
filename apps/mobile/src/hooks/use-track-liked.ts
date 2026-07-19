import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

/**
 * Whether a track is in the signed-in user's library, plus a toggle
 * action — the "Like / Save" interaction for the Full Player and detail
 * screens. There's no dedicated "is this liked" endpoint (see
 * apps/api/src/library/library.controller.ts — only `listSaved`/`save`/
 * `unsave` exist), so this composes `listSaved('track')` with a
 * client-side membership check, the same shape `useSavedAlbums`/
 * `useSavedArtists` already establish for the same reason.
 */
export function useTrackLiked(trackId: string | undefined) {
  const queryClient = useQueryClient();

  const savedTracksQuery = useQuery({
    queryKey: ['library', 'saved', 'track'],
    queryFn: () => apiClient.library.listSaved('track'),
  });

  const isLiked = Boolean(
    trackId && savedTracksQuery.data?.some((entry) => entry.entityId === trackId),
  );

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!trackId) {
        return;
      }
      if (isLiked) {
        await apiClient.library.unsave('track', trackId);
      } else {
        await apiClient.library.save({ entityType: 'track', entityId: trackId });
      }
    },
    // Optimistic update: the whole point of a like button is instant
    // feedback — waiting for a round-trip before the heart fills in
    // would read as unresponsive. Rolled back on failure via the cached
    // snapshot captured in `onMutate`.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['library', 'saved', 'track'] });
      const previous = queryClient.getQueryData(['library', 'saved', 'track']);

      queryClient.setQueryData(['library', 'saved', 'track'], (entries: typeof savedTracksQuery.data) => {
        if (!trackId || !entries) {
          return entries;
        }
        return isLiked
          ? entries.filter((entry) => entry.entityId !== trackId)
          : [...entries, { id: `optimistic-${trackId}`, entityType: 'track' as const, entityId: trackId, createdAt: new Date().toISOString() }];
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(['library', 'saved', 'track'], context?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['library', 'saved', 'track'] });
    },
  });

  return {
    isLiked,
    isLoading: savedTracksQuery.isLoading,
    toggle: () => toggleMutation.mutate(),
  };
}

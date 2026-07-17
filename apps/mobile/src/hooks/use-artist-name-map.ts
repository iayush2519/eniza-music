import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { apiClient } from '@/lib/api-client';

/**
 * Artist id -> display name lookup, built from the full artist list.
 * `Track` only carries `artistId` (see @music-app/shared-types) — this
 * hook is the one place that resolves it to a name, shared by every
 * screen that renders a track list.
 */
export function useArtistNameMap(): Map<string, string> {
  const artistsQuery = useQuery({
    queryKey: ['catalog', 'artists'],
    queryFn: () => apiClient.catalog.listArtists(),
    staleTime: 5 * 60_000,
  });

  return useMemo(() => {
    const map = new Map<string, string>();
    for (const artist of artistsQuery.data ?? []) {
      map.set(artist.id, artist.name);
    }
    return map;
  }, [artistsQuery.data]);
}

import { useInfiniteQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

const PAGE_SIZE = 10;

/**
 * "New Releases" for Home, infinite-scrolled — per Phase 4's objectives
 * ("Infinite scrolling where appropriate"). Backed by
 * `GET /catalog/albums/new-releases` (apps/api/src/catalog/
 * catalog.controller.ts), which is offset-paginated; `getNextPageParam`
 * stops paginating once a page comes back shorter than a full page,
 * which is the reliable "no more pages" signal for offset pagination
 * (an exact-`PAGE_SIZE`-length final page is the one edge case this
 * can't distinguish from "there might be more" — a harmless one extra
 * fetch that itself returns empty, not an incorrect result).
 */
export function useNewReleases() {
  return useInfiniteQuery({
    queryKey: ['catalog', 'new-releases'],
    queryFn: ({ pageParam }) =>
      apiClient.catalog.getNewReleaseAlbums({ limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
  });
}

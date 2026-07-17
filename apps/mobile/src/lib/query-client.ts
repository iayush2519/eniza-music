import { ApiError } from '@music-app/api-client';
import { QueryClient } from '@tanstack/react-query';

/**
 * Single shared QueryClient for the app. Per
 * docs/architecture/state-management.md, TanStack Query owns every piece
 * of server state (catalog data, playlists, saved entities) — this is
 * the one place that configures how that cache behaves globally.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 401 means the request already went through HttpClient's
      // refresh-on-401 handling and still failed — retrying it again at
      // the Query layer would just repeat a doomed request.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.isUnauthorized) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
  },
});

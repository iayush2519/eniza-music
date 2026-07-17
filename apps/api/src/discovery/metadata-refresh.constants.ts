/**
 * How long a cache row is considered fresh before it becomes eligible
 * for background refresh, per
 * docs/architecture/music-provider-architecture.md's "Background
 * metadata refresh" section. A single TTL for all three entity kinds is
 * simplest and sufficient at this stage — nothing currently calls for
 * per-entity-kind tuning (e.g. shorter for search-result-derived rows),
 * so introducing that distinction now would be speculative.
 */
export const METADATA_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function isStale(lastRefreshedAt: Date): boolean {
  return Date.now() - lastRefreshedAt.getTime() > METADATA_CACHE_TTL_MS;
}

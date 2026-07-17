/**
 * Formats a duration in seconds as `m:ss` (e.g. 125 -> "2:05"). Used by
 * every track-list row so run time reads consistently across Home,
 * Explore, and Library screens.
 */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * "Good morning/afternoon/evening" for Home's personalized greeting.
 * Pure function (not a hook) so it's trivially testable without
 * mocking React — `getHomeGreeting` takes the current hour explicitly
 * rather than calling `new Date()` itself.
 */
export function getHomeGreeting(hour: number): string {
  if (hour < 5) {
    return 'Good night';
  }
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  if (hour < 21) {
    return 'Good evening';
  }
  return 'Good night';
}

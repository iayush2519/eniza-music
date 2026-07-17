const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Parses a jsonwebtoken-style duration string ("15m", "30d") into
 * milliseconds. Used to compute a concrete session `expiresAt` timestamp
 * that matches the lifetime encoded in the refresh JWT itself, so the DB
 * session row and the token's own `exp` claim never disagree.
 */
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());

  if (!match) {
    throw new Error(
      `Invalid duration "${duration}". Expected a number followed by s, m, h, or d (e.g. "15m", "30d").`,
    );
  }

  const [, amount, unit] = match;
  return Number(amount) * UNIT_TO_MS[unit];
}

/**
 * @music-app/shared-types
 *
 * Single source of truth for API contract shapes shared between
 * `apps/mobile` and `apps/api`. Domain types (Track, Album, Playlist, User,
 * etc.) are added starting in Phase 4 (Catalog & library domain) once the
 * backend schema exists to model them against.
 *
 * This package intentionally has zero runtime dependencies — it should only
 * ever export types/interfaces (and, where useful, small pure type guards),
 * never framework code.
 */

export const SHARED_TYPES_PACKAGE_NAME = '@music-app/shared-types' as const;

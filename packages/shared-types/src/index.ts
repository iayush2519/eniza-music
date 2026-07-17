/**
 * @music-app/shared-types
 *
 * Single source of truth for API contract shapes shared between
 * `apps/mobile` and `apps/api`. `domain/` holds the entity shapes returned
 * by the API (Track, Album, Artist, Playlist, LibraryEntry, UserProfile);
 * `requests/` holds the request-body shapes each mutating endpoint
 * accepts. Backend response DTOs `implements` these types directly (see
 * e.g. apps/api/src/catalog/dto/track-response.dto.ts), so the mobile
 * app and backend can never silently drift on a response shape — a
 * mismatch is a TypeScript compile error, not a runtime surprise.
 *
 * This package intentionally has zero runtime dependencies — it should only
 * ever export types/interfaces (and, where useful, small pure type guards),
 * never framework code.
 */

export * from './domain';
export * from './requests';

export const SHARED_TYPES_PACKAGE_NAME = '@music-app/shared-types' as const;

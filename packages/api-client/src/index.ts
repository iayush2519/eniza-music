import { SHARED_TYPES_PACKAGE_NAME } from '@music-app/shared-types';

/**
 * @music-app/api-client
 *
 * Typed fetch layer consumed by apps/mobile, built on top of
 * @music-app/shared-types. Real endpoint methods are added starting in
 * Phase 3 (Backend core) once the `auth`/`users` modules exist to call.
 *
 * Left minimal in Phase 1 — this package exists now so the workspace
 * dependency graph (api-client -> shared-types) and build pipeline are
 * verified end to end before any real endpoints exist.
 */

export const API_CLIENT_PACKAGE_NAME = '@music-app/api-client' as const;

/** Sanity re-export proving the shared-types dependency resolves correctly. */
export { SHARED_TYPES_PACKAGE_NAME };

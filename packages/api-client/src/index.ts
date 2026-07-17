/**
 * @music-app/api-client
 *
 * Typed fetch layer consumed by `apps/mobile`, built on
 * `@music-app/shared-types`. `ApiClient` groups endpoints by domain
 * (`auth`, `catalog`, `library`) and centralizes cross-cutting concerns —
 * attaching the access token, refreshing it transparently on expiry, and
 * throwing a typed `ApiError` for failed requests — so screen code never
 * touches `fetch` directly. See docs/architecture/mobile-api-layer.md.
 */
export * from './api-client';
export * from './errors';
export * from './token-store';

export const API_CLIENT_PACKAGE_NAME = '@music-app/api-client' as const;

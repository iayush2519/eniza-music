/**
 * Artist — public-facing profile. Mirrors
 * apps/api/src/catalog/dto/artist-response.dto.ts.
 */
export type Artist = {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  /**
   * Which `MusicProvider` this row was cached from (e.g. `'jamendo'`),
   * and that provider's own id for the entity. Both null for rows
   * created before the provider-cache pivot — see
   * docs/decisions/0007-provider-backed-music-catalog.md. The mobile app
   * never needs to render these; they exist for backend cache-key lookups.
   */
  providerId: string | null;
  externalId: string | null;
};

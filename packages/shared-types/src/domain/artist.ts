/**
 * Artist — public-facing profile. Mirrors
 * apps/api/src/catalog/dto/artist-response.dto.ts.
 */
export type Artist = {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
};

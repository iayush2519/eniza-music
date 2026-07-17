import type { Album } from '@music-app/shared-types';

export class AlbumResponseDto implements Album {
  id!: string;
  artistId!: string;
  title!: string;
  coverArtUrl!: string | null;
  releasedAt!: string | null;
  providerId!: string | null;
  externalId!: string | null;
}

import type { Artist } from '@music-app/shared-types';

export class ArtistResponseDto implements Artist {
  id!: string;
  name!: string;
  bio!: string | null;
  avatarUrl!: string | null;
}

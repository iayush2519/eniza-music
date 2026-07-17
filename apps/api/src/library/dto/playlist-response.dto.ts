import type { Playlist, PlaylistWithTracks } from '@music-app/shared-types';

import { TrackResponseDto } from '../../catalog/dto';

export class PlaylistResponseDto implements Playlist {
  id!: string;
  userId!: string;
  title!: string;
  description!: string | null;
  createdAt!: string;
  updatedAt!: string;
}

export class PlaylistWithTracksResponseDto
  extends PlaylistResponseDto
  implements PlaylistWithTracks
{
  tracks!: TrackResponseDto[];
}

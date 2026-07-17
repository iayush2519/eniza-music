import { TrackResponseDto } from '../../catalog/dto';

export class PlaylistResponseDto {
  id!: string;
  userId!: string;
  title!: string;
  description!: string | null;
  createdAt!: string;
  updatedAt!: string;
}

export class PlaylistWithTracksResponseDto extends PlaylistResponseDto {
  tracks!: TrackResponseDto[];
}

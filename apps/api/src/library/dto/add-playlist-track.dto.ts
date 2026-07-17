import { IsUUID } from 'class-validator';

export class AddPlaylistTrackDto {
  @IsUUID()
  trackId!: string;
}

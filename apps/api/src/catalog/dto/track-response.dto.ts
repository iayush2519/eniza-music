export class TrackResponseDto {
  id!: string;
  artistId!: string;
  albumId!: string | null;
  title!: string;
  durationSeconds!: number;
  trackNumber!: number | null;
  audioUrl!: string;
  coverArtUrl!: string | null;
}

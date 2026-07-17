import { AlbumResponseDto } from '../../catalog/dto/album-response.dto';
import { ArtistResponseDto } from '../../catalog/dto/artist-response.dto';
import { TrackResponseDto } from '../../catalog/dto/track-response.dto';

/**
 * Response shape for `GET /search`. Reuses the existing catalog response
 * DTOs (`TrackResponseDto`/`AlbumResponseDto`/`ArtistResponseDto`) rather
 * than inventing parallel "search result" types — a search result and a
 * catalog cache-entity lookup return the exact same normalized shape, per
 * docs/architecture/music-provider-architecture.md ("Both ultimately
 * render the same underlying Track/Album/Artist shapes").
 */
export class SearchResponseDto {
  tracks!: TrackResponseDto[];
  albums!: AlbumResponseDto[];
  artists!: ArtistResponseDto[];
}

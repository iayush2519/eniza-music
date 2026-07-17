import { AlbumResponseDto } from './dto/album-response.dto';
import { ArtistResponseDto } from './dto/artist-response.dto';
import { TrackResponseDto } from './dto/track-response.dto';
import { Album, Artist, Track } from '../database/schema';

/**
 * Shared entity -> response-DTO mappers, used by `CatalogController` and
 * by other modules (e.g. `library`) that need to embed catalog entities
 * in their own responses (a playlist's tracks, for example) without
 * duplicating the mapping logic or leaking raw Drizzle rows.
 */
export function toTrackDto(track: Track): TrackResponseDto {
  return {
    id: track.id,
    artistId: track.artistId,
    albumId: track.albumId,
    title: track.title,
    durationSeconds: track.durationSeconds,
    trackNumber: track.trackNumber,
    audioUrl: track.audioUrl,
    coverArtUrl: track.coverArtUrl,
    providerId: track.providerId,
    externalId: track.externalId,
  };
}

export function toAlbumDto(album: Album): AlbumResponseDto {
  return {
    id: album.id,
    artistId: album.artistId,
    title: album.title,
    coverArtUrl: album.coverArtUrl,
    releasedAt: album.releasedAt?.toISOString() ?? null,
    providerId: album.providerId,
    externalId: album.externalId,
  };
}

export function toArtistDto(artist: Artist): ArtistResponseDto {
  return {
    id: artist.id,
    name: artist.name,
    bio: artist.bio,
    avatarUrl: artist.avatarUrl,
    providerId: artist.providerId,
    externalId: artist.externalId,
  };
}

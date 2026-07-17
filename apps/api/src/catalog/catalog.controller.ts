import { Controller, Get, NotFoundException, Param } from '@nestjs/common';

import { AlbumsService } from './albums.service';
import { ArtistsService } from './artists.service';
import { toAlbumDto, toArtistDto, toTrackDto } from './catalog.mappers';
import { AlbumResponseDto, ArtistResponseDto, TrackResponseDto } from './dto';
import { TracksService } from './tracks.service';

/**
 * Public, read-only catalog browsing. No `JwtAuthGuard` on this
 * controller — per docs/architecture/content-model.md, catalog browsing
 * is a listener-facing capability that doesn't require an account.
 *
 * Per docs/decisions/0007-provider-backed-music-catalog.md and Milestone
 * 12 of the provider-cache pivot, the "browse every track/album" routes
 * that used to exist here (`GET /catalog/tracks`, `GET /catalog/tracks/
 * search`, `GET /catalog/albums`) have been removed: `/search` (see
 * discovery/search.controller.ts) is the real discovery entry point now,
 * and enumerating an unbounded, ever-growing metadata cache was never a
 * meaningful operation once tracks/albums stopped being an owned,
 * intentionally-curated catalog. What remains here are single-entity
 * lookups by local cache id and scoped relational reads (an artist's own
 * albums/tracks, an album's own tracks) — bounded operations that stay
 * meaningful regardless of overall cache size.
 *
 * `GET /catalog/artists` (list) is the one exception kept from that
 * retirement: `useArtistNameMap` on mobile (shared by Home and Explore)
 * resolves every track's `artistId` to a display name via this endpoint,
 * and removing it would regress both screens. Unlike the removed track/
 * album list routes, this isn't "browse an unbounded external catalog"
 * — it lists our own local artist cache, which only grows as large as
 * what users have actually searched or played. A bulk name-lookup
 * endpoint (`?ids=`) would scale better than "return every cached
 * artist" as the cache grows, but that's a scoped follow-up, not part of
 * this cleanup.
 */
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly tracksService: TracksService,
    private readonly albumsService: AlbumsService,
    private readonly artistsService: ArtistsService,
  ) {}

  @Get('tracks/:id')
  async getTrack(@Param('id') id: string): Promise<TrackResponseDto> {
    const track = await this.tracksService.findById(id);
    if (!track) {
      throw new NotFoundException('Track not found');
    }
    return toTrackDto(track);
  }

  @Get('albums/:id')
  async getAlbum(@Param('id') id: string): Promise<AlbumResponseDto> {
    const album = await this.albumsService.findById(id);
    if (!album) {
      throw new NotFoundException('Album not found');
    }
    return toAlbumDto(album);
  }

  @Get('albums/:id/tracks')
  async getAlbumTracks(@Param('id') id: string): Promise<TrackResponseDto[]> {
    const tracks = await this.tracksService.findByAlbumId(id);
    return tracks.map(toTrackDto);
  }

  @Get('artists')
  async listArtists(): Promise<ArtistResponseDto[]> {
    const artists = await this.artistsService.findAll();
    return artists.map(toArtistDto);
  }

  @Get('artists/:id')
  async getArtist(@Param('id') id: string): Promise<ArtistResponseDto> {
    const artist = await this.artistsService.findById(id);
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }
    return toArtistDto(artist);
  }

  @Get('artists/:id/albums')
  async getArtistAlbums(@Param('id') id: string): Promise<AlbumResponseDto[]> {
    const albums = await this.albumsService.findByArtistId(id);
    return albums.map(toAlbumDto);
  }

  @Get('artists/:id/tracks')
  async getArtistTracks(@Param('id') id: string): Promise<TrackResponseDto[]> {
    const tracks = await this.tracksService.findByArtistId(id);
    return tracks.map(toTrackDto);
  }
}

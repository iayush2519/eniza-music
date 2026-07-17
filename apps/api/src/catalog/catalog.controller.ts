import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';

import { AlbumsService } from './albums.service';
import { ArtistsService } from './artists.service';
import { toAlbumDto, toArtistDto, toTrackDto } from './catalog.mappers';
import { AlbumResponseDto, ArtistResponseDto, SearchTracksDto, TrackResponseDto } from './dto';
import { TracksService } from './tracks.service';

/**
 * Public, read-only catalog browsing. No `JwtAuthGuard` on this
 * controller — per docs/architecture/content-model.md, catalog browsing
 * is a listener-facing capability that doesn't require an account.
 */
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly tracksService: TracksService,
    private readonly albumsService: AlbumsService,
    private readonly artistsService: ArtistsService,
  ) {}

  @Get('tracks')
  async listTracks(): Promise<TrackResponseDto[]> {
    const tracks = await this.tracksService.findAll();
    return tracks.map(toTrackDto);
  }

  @Get('tracks/search')
  async searchTracks(@Query() query: SearchTracksDto): Promise<TrackResponseDto[]> {
    const tracks = await this.tracksService.searchByTitle(query.q);
    return tracks.map(toTrackDto);
  }

  @Get('tracks/:id')
  async getTrack(@Param('id') id: string): Promise<TrackResponseDto> {
    const track = await this.tracksService.findById(id);
    if (!track) {
      throw new NotFoundException('Track not found');
    }
    return toTrackDto(track);
  }

  @Get('albums')
  async listAlbums(): Promise<AlbumResponseDto[]> {
    const albums = await this.albumsService.findAll();
    return albums.map(toAlbumDto);
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

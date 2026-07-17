import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  AddPlaylistTrackDto,
  CreatePlaylistDto,
  LibraryEntryResponseDto,
  PlaylistResponseDto,
  PlaylistWithTracksResponseDto,
  SaveLibraryEntryDto,
  UpdatePlaylistDto,
} from './dto';
import { LibraryEntriesService } from './library-entries.service';
import { PlaylistTracksService } from './playlist-tracks.service';
import { PlaylistsService } from './playlists.service';
import { toTrackDto } from '../catalog/catalog.mappers';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Playlist } from '../database/schema';
import type { User } from '../database/schema';

function toPlaylistDto(playlist: Playlist): PlaylistResponseDto {
  return {
    id: playlist.id,
    userId: playlist.userId,
    title: playlist.title,
    description: playlist.description,
    createdAt: playlist.createdAt.toISOString(),
    updatedAt: playlist.updatedAt.toISOString(),
  };
}

/**
 * A user's playlists, likes, and follows. Every route requires
 * authentication and every mutation is scoped to the current user — per
 * docs/architecture/security.md ("ownership is checked explicitly in
 * service logic"), a user can only read/modify their own library data.
 */
@UseGuards(JwtAuthGuard)
@Controller('library')
export class LibraryController {
  constructor(
    private readonly playlistsService: PlaylistsService,
    private readonly playlistTracksService: PlaylistTracksService,
    private readonly libraryEntriesService: LibraryEntriesService,
  ) {}

  @Get('playlists')
  async listPlaylists(@CurrentUser() user: User): Promise<PlaylistResponseDto[]> {
    const playlists = await this.playlistsService.findAllForUser(user.id);
    return playlists.map(toPlaylistDto);
  }

  @Post('playlists')
  async createPlaylist(
    @CurrentUser() user: User,
    @Body() dto: CreatePlaylistDto,
  ): Promise<PlaylistResponseDto> {
    const playlist = await this.playlistsService.create({
      userId: user.id,
      title: dto.title,
      description: dto.description,
    });
    return toPlaylistDto(playlist);
  }

  @Get('playlists/:id')
  async getPlaylist(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<PlaylistWithTracksResponseDto> {
    const playlist = await this.requireOwnedPlaylist(id, user.id);
    const tracks = await this.playlistTracksService.findTracksForPlaylist(id);

    return { ...toPlaylistDto(playlist), tracks: tracks.map(toTrackDto) };
  }

  @Patch('playlists/:id')
  async updatePlaylist(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdatePlaylistDto,
  ): Promise<PlaylistResponseDto> {
    await this.requireOwnedPlaylist(id, user.id);
    const playlist = await this.playlistsService.update(id, dto);
    return toPlaylistDto(playlist);
  }

  @Delete('playlists/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePlaylist(@CurrentUser() user: User, @Param('id') id: string): Promise<void> {
    await this.requireOwnedPlaylist(id, user.id);
    await this.playlistsService.delete(id);
  }

  @Post('playlists/:id/tracks')
  async addTrackToPlaylist(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AddPlaylistTrackDto,
  ): Promise<PlaylistWithTracksResponseDto> {
    const playlist = await this.requireOwnedPlaylist(id, user.id);

    const alreadyPresent = await this.playlistTracksService.isTrackInPlaylist(id, dto.trackId);
    if (!alreadyPresent) {
      await this.playlistTracksService.addTrack(id, dto.trackId);
    }

    const tracks = await this.playlistTracksService.findTracksForPlaylist(id);
    return { ...toPlaylistDto(playlist), tracks: tracks.map(toTrackDto) };
  }

  @Delete('playlists/:id/tracks/:trackId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTrackFromPlaylist(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('trackId') trackId: string,
  ): Promise<void> {
    await this.requireOwnedPlaylist(id, user.id);
    await this.playlistTracksService.removeTrack(id, trackId);
  }

  @Get('saved')
  async listSaved(
    @CurrentUser() user: User,
    @Query('entityType') entityType?: 'track' | 'album' | 'artist',
  ): Promise<LibraryEntryResponseDto[]> {
    const entries = await this.libraryEntriesService.findAllForUser(user.id, entityType);
    return entries.map((entry) => ({
      id: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  @Post('saved')
  @HttpCode(HttpStatus.NO_CONTENT)
  async save(@CurrentUser() user: User, @Body() dto: SaveLibraryEntryDto): Promise<void> {
    await this.libraryEntriesService.save(user.id, dto.entityType, dto.entityId);
  }

  @Delete('saved/:entityType/:entityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsave(
    @CurrentUser() user: User,
    @Param('entityType') entityType: 'track' | 'album' | 'artist',
    @Param('entityId') entityId: string,
  ): Promise<void> {
    await this.libraryEntriesService.remove(user.id, entityType, entityId);
  }

  /** Loads a playlist and throws 404/403 if it doesn't belong to `userId`,
   * without ever revealing whether a playlist with that id exists for a
   * different user (404, not 403, on a mismatch — no existence leak). */
  private async requireOwnedPlaylist(id: string, userId: string): Promise<Playlist> {
    const playlist = await this.playlistsService.findById(id);

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw new NotFoundException('Playlist not found');
    }

    return playlist;
  }
}

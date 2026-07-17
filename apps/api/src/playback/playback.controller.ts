import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { ResolvedStreamResponseDto } from './dto';
import { PlaybackService } from './playback.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '../database/schema';

/**
 * Resolves a playable stream URL for a track — the last step of the
 * product's primary flow ("Open App → Home ⇄ Search → Results → Tap
 * Track → Immediate Playback", per
 * docs/architecture/music-provider-architecture.md). Guarded, same as
 * `SearchController`: every resolution writes a `listening_history` row
 * scoped to the requesting user, so there is no anonymous playback
 * request to serve here.
 *
 * `trackId` is the local metadata cache id (the same id playlists,
 * library entries, and search results all use), not a raw provider id —
 * mobile never needs to know which provider a track came from to play it.
 */
@UseGuards(JwtAuthGuard)
@Controller('playback')
export class PlaybackController {
  constructor(private readonly playbackService: PlaybackService) {}

  @Get('resolve/:trackId')
  async resolve(
    @CurrentUser() user: User,
    @Param('trackId') trackId: string,
  ): Promise<ResolvedStreamResponseDto> {
    return this.playbackService.resolveStreamUrl(user.id, trackId);
  }
}

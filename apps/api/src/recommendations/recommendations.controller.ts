import { Controller, Get, UseGuards } from '@nestjs/common';

import { RecommendationSectionResponseDto } from './dto';
import { RecommendationsService } from './recommendations.service';
import { toTrackDto } from '../catalog/catalog.mappers';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '../database/schema';

/**
 * Backs the personalized Home feed — per
 * docs/architecture/music-provider-architecture.md, Home stays the
 * personalized landing page (recommendations, recently played, your
 * playlists), not replaced by Search. Guarded, same as `SearchController`/
 * `PlaybackController`: recommendations are computed entirely from the
 * requesting user's own history/likes, so there is nothing meaningful to
 * return for an anonymous request.
 */
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  async getRecommendations(@CurrentUser() user: User): Promise<RecommendationSectionResponseDto[]> {
    const sections = await this.recommendationsService.getSections(user.id);

    return sections.map((section) => ({
      id: section.id,
      title: section.title,
      tracks: section.tracks.map(toTrackDto),
    }));
  }
}

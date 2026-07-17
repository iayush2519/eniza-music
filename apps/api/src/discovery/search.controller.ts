import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { SearchQueryDto, SearchResponseDto } from './dto';
import { SearchService } from './search.service';
import { toAlbumDto, toArtistDto, toTrackDto } from '../catalog/catalog.mappers';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '../database/schema';

/**
 * The primary discovery entry point — per
 * docs/architecture/music-provider-architecture.md's product flow
 * ("Open App → Home ⇄ Search → Results → Tap Track → Immediate
 * Playback"). Guarded (unlike the old public `CatalogController`)
 * because every search writes a `search_history` row scoped to the
 * requesting user — there is no anonymous search history to record
 * against, so an anonymous search request has nothing meaningful to do
 * here.
 */
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @CurrentUser() user: User,
    @Query() query: SearchQueryDto,
  ): Promise<SearchResponseDto> {
    const result = await this.searchService.search(user.id, query.q, query.type);

    return {
      tracks: result.tracks.map(toTrackDto),
      albums: result.albums.map(toAlbumDto),
      artists: result.artists.map(toArtistDto),
    };
  }
}

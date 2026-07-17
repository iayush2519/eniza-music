import { Inject, Injectable } from '@nestjs/common';

import { GatewaySearchResult, MusicGateway } from './music-gateway.service';
import { SearchEntityType } from './providers/music-provider.interface';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { searchHistory } from '../database/schema';

/**
 * Backs `GET /search`. Delegates the actual lookup to `MusicGateway`
 * (cache-first, upsert-on-miss — see music-gateway.service.ts) and adds
 * the one piece of behavior that's specific to a *user-facing search
 * request* rather than an arbitrary Gateway lookup: recording a
 * `search_history` row, per
 * docs/architecture/music-provider-architecture.md's search architecture.
 */
@Injectable()
export class SearchService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly musicGateway: MusicGateway,
  ) {}

  async search(
    userId: string,
    query: string,
    type?: SearchEntityType,
  ): Promise<GatewaySearchResult> {
    const result = await this.musicGateway.search(query, { type });
    const resultCount = result.tracks.length + result.albums.length + result.artists.length;

    // Fire-and-forget: recording history should never slow down or fail
    // the search response the user is waiting on. Explicitly caught
    // (not just `void`-ignored) so a write failure becomes a logged
    // warning, not an unhandled promise rejection.
    this.recordSearch(userId, query, resultCount).catch((error: unknown) => {
      console.error('SearchService: failed to record search history', error);
    });

    return result;
  }

  private async recordSearch(userId: string, query: string, resultCount: number): Promise<void> {
    await this.db.insert(searchHistory).values({ userId, query, resultCount });
  }
}

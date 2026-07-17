import { Module } from '@nestjs/common';

import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { DiscoveryModule } from '../discovery/discovery.module';

/**
 * Heuristic recommendations over our own behavioral data, with optional
 * provider-side enrichment — per
 * docs/decisions/0007-provider-backed-music-catalog.md. Depends on
 * `DiscoveryModule` for `MusicGateway`, same as `PlaybackModule` — this
 * module never talks to a `MusicProvider` directly.
 */
@Module({
  imports: [DiscoveryModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}

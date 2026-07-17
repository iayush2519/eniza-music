import { Module } from '@nestjs/common';

import { PlaybackController } from './playback.controller';
import { PlaybackService } from './playback.service';
import { DiscoveryModule } from '../discovery/discovery.module';

/**
 * Resolves playable stream URLs and records listening history, per
 * docs/architecture/music-provider-architecture.md's playback
 * architecture. Depends on `DiscoveryModule` for `MusicGateway` — this
 * module never talks to a `MusicProvider` directly, same discipline as
 * `SearchModule` (folded into `DiscoveryModule` in an earlier milestone).
 */
@Module({
  imports: [DiscoveryModule],
  controllers: [PlaybackController],
  providers: [PlaybackService],
})
export class PlaybackModule {}

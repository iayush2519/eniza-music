import { Module } from '@nestjs/common';

import { MusicGateway } from './music-gateway.service';
import { MockProvider } from './providers/mock-provider';

/**
 * Owns the `MusicProvider` abstraction and its concrete adapters, per
 * docs/architecture/music-provider-architecture.md. This module is the
 * only part of the backend allowed to call an external music API — every
 * other module reaches providers through `MusicGateway`, never a
 * `MusicProvider` implementation directly.
 *
 * `MockProvider` remains exported directly for now (in addition to
 * `MusicGateway`) since nothing outside this module needs it yet — that
 * changes once provider selection (Jamendo vs. mock, by configuration)
 * lands in a later milestone.
 */
@Module({
  providers: [MockProvider, MusicGateway],
  exports: [MockProvider, MusicGateway],
})
export class DiscoveryModule {}

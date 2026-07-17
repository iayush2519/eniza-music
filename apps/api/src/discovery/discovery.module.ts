import { Module } from '@nestjs/common';

import { MockProvider } from './providers/mock-provider';

/**
 * Owns the `MusicProvider` abstraction and its concrete adapters, per
 * docs/architecture/music-provider-architecture.md. This module is the
 * only part of the backend allowed to call an external music API — every
 * other module reaches providers through a `MusicGateway` (added in a
 * later milestone), never directly.
 *
 * `MockProvider` is exported directly for now, ahead of the Gateway/
 * provider-selection wiring that lands in the next milestone — nothing
 * outside this module consumes it yet.
 */
@Module({
  providers: [MockProvider],
  exports: [MockProvider],
})
export class DiscoveryModule {}

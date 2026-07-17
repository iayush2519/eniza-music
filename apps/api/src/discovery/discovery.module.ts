import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ACTIVE_MUSIC_PROVIDER } from './discovery.constants';
import { MusicGateway } from './music-gateway.service';
import { JamendoProvider } from './providers/jamendo-provider';
import { MockProvider } from './providers/mock-provider';
import { EnvironmentVariables } from '../config/env.validation';

/**
 * Owns the `MusicProvider` abstraction and its concrete adapters, per
 * docs/architecture/music-provider-architecture.md. This module is the
 * only part of the backend allowed to call an external music API — every
 * other module reaches providers through `MusicGateway`, never a
 * `MusicProvider` implementation directly.
 *
 * Provider selection happens once, here, behind the `ACTIVE_MUSIC_PROVIDER`
 * token: `JamendoProvider` when `JAMENDO_CLIENT_ID` is configured,
 * `MockProvider` otherwise (local dev without a key, and every test —
 * `jest-e2e-setup.ts` never sets `JAMENDO_CLIENT_ID`). `MusicGateway`
 * never checks configuration itself; it only ever sees "the active
 * provider" via the token, so adding a third provider later is a change
 * to this factory alone.
 */
@Module({
  providers: [
    MockProvider,
    JamendoProvider,
    MusicGateway,
    {
      provide: ACTIVE_MUSIC_PROVIDER,
      inject: [ConfigService, MockProvider, JamendoProvider],
      useFactory: (
        config: ConfigService<EnvironmentVariables, true>,
        mockProvider: MockProvider,
        jamendoProvider: JamendoProvider,
      ) => (config.get('JAMENDO_CLIENT_ID', { infer: true }) ? jamendoProvider : mockProvider),
    },
  ],
  exports: [MockProvider, JamendoProvider, MusicGateway, ACTIVE_MUSIC_PROVIDER],
})
export class DiscoveryModule {}

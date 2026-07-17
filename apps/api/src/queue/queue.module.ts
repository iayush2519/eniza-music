import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BullMqMetadataRefreshQueue } from './bullmq-metadata-refresh-queue';
import { InlineMetadataRefreshQueue } from './inline-metadata-refresh-queue';
import { METADATA_REFRESH_QUEUE } from './queue.constants';
import { EnvironmentVariables } from '../config/env.validation';

/**
 * Selects the active `MetadataRefreshQueue` behind the
 * `METADATA_REFRESH_QUEUE` token — `BullMqMetadataRefreshQueue` when
 * `REDIS_URL` is configured, `InlineMetadataRefreshQueue` otherwise
 * (local dev without Docker running, and every test — same reasoning
 * `discovery.module.ts` applies to `ACTIVE_MUSIC_PROVIDER`). Consumers
 * (`MusicGateway`, the refresh processor, the scheduled sweep) only ever
 * see the token, never a concrete class.
 *
 * `BullMqMetadataRefreshQueue` is deliberately **not** listed in
 * `providers` and is never constructed by Nest's own injector — its
 * constructor opens a real Redis connection as a side effect, so it must
 * only be constructed when `REDIS_URL` is actually set. The factory
 * below constructs it manually (a plain `new`) in that branch only,
 * rather than letting Nest eagerly instantiate every listed provider
 * regardless of which one the factory picks.
 */
@Module({
  providers: [
    InlineMetadataRefreshQueue,
    {
      provide: METADATA_REFRESH_QUEUE,
      inject: [ConfigService, InlineMetadataRefreshQueue],
      useFactory: (
        config: ConfigService<EnvironmentVariables, true>,
        inlineQueue: InlineMetadataRefreshQueue,
      ) => {
        const redisUrl = config.get('REDIS_URL', { infer: true });
        return redisUrl ? new BullMqMetadataRefreshQueue(config) : inlineQueue;
      },
    },
  ],
  exports: [METADATA_REFRESH_QUEUE],
})
export class QueueModule {}

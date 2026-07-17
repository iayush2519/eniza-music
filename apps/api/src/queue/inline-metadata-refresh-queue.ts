import { Injectable, Logger } from '@nestjs/common';

import type { MetadataRefreshJob, MetadataRefreshQueue } from './metadata-refresh-queue.interface';

/**
 * Default `MetadataRefreshQueue` when no `REDIS_URL` is configured
 * (local dev without Docker running, and every test — see
 * discovery.module.ts's provider-selection factory for the identical
 * reasoning applied to `ACTIVE_MUSIC_PROVIDER`). Runs the job inline,
 * on the next microtask, rather than talking to Redis at all.
 *
 * This is not a toy stand-in: `MusicGateway`'s lazy-refresh-on-read path
 * (see music-gateway.service.ts) explicitly does not await the enqueue
 * — a stale row is still returned immediately either way — so "inline"
 * here still preserves the real behavioral contract (refresh happens
 * in the background, never blocks the read), just without a durable,
 * cross-process job store. Genuinely fine for a single-process API and
 * for tests, where the entire point is to avoid a real Redis dependency.
 */
@Injectable()
export class InlineMetadataRefreshQueue implements MetadataRefreshQueue {
  private readonly logger = new Logger(InlineMetadataRefreshQueue.name);
  private handler: ((job: MetadataRefreshJob) => Promise<void>) | null = null;

  enqueue(job: MetadataRefreshJob): Promise<void> {
    queueMicrotask(() => {
      void this.handler?.(job).catch((error: unknown) => {
        this.logger.warn(
          `Inline refresh failed for ${job.entityType} ${job.localId}: ${String(error)}`,
        );
      });
    });
    return Promise.resolve();
  }

  registerProcessor(handler: (job: MetadataRefreshJob) => Promise<void>): void {
    this.handler = handler;
  }
}

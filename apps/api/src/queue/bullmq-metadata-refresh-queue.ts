import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

import type { MetadataRefreshJob, MetadataRefreshQueue } from './metadata-refresh-queue.interface';
import { EnvironmentVariables } from '../config/env.validation';

const QUEUE_NAME = 'metadata-refresh';

/**
 * Real, Redis-backed `MetadataRefreshQueue` — selected instead of
 * `InlineMetadataRefreshQueue` when `REDIS_URL` is configured (see
 * discovery.module.ts). Durable and cross-process: unlike the inline
 * queue, a job survives an API process restart between enqueue and
 * processing, and multiple API instances could share one Redis-backed
 * queue without duplicating work (BullMQ's own locking handles that).
 *
 * `maxRetriesPerRequest: null` is required by BullMQ for the Redis
 * connection it manages (see BullMQ's own docs) — it disables ioredis's
 * command-level retry limit so BullMQ's blocking commands aren't
 * interrupted.
 */
@Injectable()
export class BullMqMetadataRefreshQueue implements MetadataRefreshQueue, OnModuleDestroy {
  private readonly logger = new Logger(BullMqMetadataRefreshQueue.name);
  private readonly connection: IORedis;
  private readonly queue: Queue<MetadataRefreshJob>;
  private worker: Worker<MetadataRefreshJob> | null = null;

  constructor(@Inject(ConfigService) config: ConfigService<EnvironmentVariables, true>) {
    const redisUrl = config.get('REDIS_URL', { infer: true });
    // Only constructed when discovery.module.ts's factory has already
    // confirmed REDIS_URL is set — this non-null assertion documents
    // that invariant rather than silently tolerating a missing URL.
    this.connection = new IORedis(redisUrl!, { maxRetriesPerRequest: null });
    this.queue = new Queue<MetadataRefreshJob>(QUEUE_NAME, { connection: this.connection });
  }

  async enqueue(job: MetadataRefreshJob): Promise<void> {
    await this.queue.add(`${job.entityType}:${job.localId}`, job, {
      // A cache row that's already been refreshed recently doesn't need
      // a second job queued on top of it — jobId collision (same entity
      // enqueued twice before the first run completes) is treated as a
      // no-op by BullMQ rather than a duplicate job.
      jobId: `${job.entityType}:${job.localId}`,
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }

  registerProcessor(handler: (job: MetadataRefreshJob) => Promise<void>): void {
    this.worker = new Worker<MetadataRefreshJob>(
      QUEUE_NAME,
      async (job: Job<MetadataRefreshJob>) => handler(job.data),
      { connection: this.connection },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.warn(`Refresh job ${job?.id ?? '(unknown)'} failed: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
    this.connection.disconnect();
  }
}

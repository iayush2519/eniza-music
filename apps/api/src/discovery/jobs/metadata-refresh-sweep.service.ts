import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { MusicGateway } from '../music-gateway.service';
import type { MetadataRefreshQueue } from '../../queue/metadata-refresh-queue.interface';
import { METADATA_REFRESH_QUEUE } from '../../queue/queue.constants';

/**
 * The scheduled half of background metadata refresh, per
 * docs/architecture/music-provider-architecture.md: catches stale cache
 * rows that lazy refresh-on-read never touches — e.g. a track sitting
 * untouched in a playlist nobody has opened in weeks. Runs hourly,
 * enqueueing at most `SWEEP_BATCH_LIMIT` stale rows per entity kind per
 * tick, so a large backlog drains gradually rather than flooding the
 * queue in one run.
 */
@Injectable()
export class MetadataRefreshSweepService {
  private static readonly SWEEP_BATCH_LIMIT = 50;

  private readonly logger = new Logger(MetadataRefreshSweepService.name);

  constructor(
    private readonly musicGateway: MusicGateway,
    @Inject(METADATA_REFRESH_QUEUE) private readonly refreshQueue: MetadataRefreshQueue,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweep(): Promise<void> {
    const staleEntities = await this.musicGateway.findStaleEntities(
      MetadataRefreshSweepService.SWEEP_BATCH_LIMIT,
    );

    if (staleEntities.length === 0) {
      return;
    }

    await Promise.all(staleEntities.map((job) => this.refreshQueue.enqueue(job)));
    this.logger.log(`Enqueued ${staleEntities.length} stale cache row(s) for refresh`);
  }
}

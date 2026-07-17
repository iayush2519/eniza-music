import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { MusicGateway } from '../music-gateway.service';
import type {
  MetadataRefreshJob,
  MetadataRefreshQueue,
} from '../../queue/metadata-refresh-queue.interface';
import { METADATA_REFRESH_QUEUE } from '../../queue/queue.constants';

/**
 * The consumer side of the metadata-refresh queue, per
 * docs/architecture/music-provider-architecture.md's background refresh
 * design. Registers itself as the active `MetadataRefreshQueue`'s
 * processor on module init, and dispatches each job to the matching
 * `MusicGateway.refresh*` method by `entityType`.
 *
 * Deliberately thin: all the actual refresh logic (re-fetch from the
 * provider, upsert in place, flag `unavailable` if the provider reports
 * the entity is gone) lives on `MusicGateway`, which already owns every
 * other read/write path to the cache tables — this processor is just the
 * queue-triggered entry point into that existing logic, not a second
 * place that knows how to write to `artists`/`albums`/`tracks`.
 */
@Injectable()
export class MetadataRefreshProcessor implements OnModuleInit {
  private readonly logger = new Logger(MetadataRefreshProcessor.name);

  constructor(
    @Inject(METADATA_REFRESH_QUEUE) private readonly refreshQueue: MetadataRefreshQueue,
    private readonly musicGateway: MusicGateway,
  ) {}

  onModuleInit(): void {
    this.refreshQueue.registerProcessor((job) => this.process(job));
  }

  private async process(job: MetadataRefreshJob): Promise<void> {
    switch (job.entityType) {
      case 'track':
        await this.musicGateway.refreshTrack(job.localId);
        break;
      case 'album':
        await this.musicGateway.refreshAlbum(job.localId);
        break;
      case 'artist':
        await this.musicGateway.refreshArtist(job.localId);
        break;
    }
    this.logger.debug(`Refreshed ${job.entityType} ${job.localId}`);
  }
}

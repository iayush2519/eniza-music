import { Module } from '@nestjs/common';

import { AlbumsService } from './albums.service';
import { ArtistsService } from './artists.service';
import { CatalogController } from './catalog.controller';
import { TracksService } from './tracks.service';

/**
 * Read-only access to the local metadata cache tables
 * (`artists`/`albums`/`tracks`), per
 * docs/decisions/0007-provider-backed-music-catalog.md. No auth required
 * — these are public reads. `MusicGateway` (in `discovery`) is the only
 * writer of these tables now; this module never mutates them, and the
 * seed script populates them through the Gateway rather than through
 * these services (see database/seed.ts).
 */
@Module({
  controllers: [CatalogController],
  providers: [ArtistsService, AlbumsService, TracksService],
  exports: [ArtistsService, AlbumsService, TracksService],
})
export class CatalogModule {}

import { Module } from '@nestjs/common';

import { AlbumsService } from './albums.service';
import { ArtistsService } from './artists.service';
import { CatalogController } from './catalog.controller';
import { TracksService } from './tracks.service';

/**
 * Read-heavy, source-agnostic catalog browsing per
 * docs/architecture/content-model.md. No auth required — catalog browsing
 * is public. Mutating catalog data (creating tracks/albums as an artist)
 * is a Phase-later `upload` module concern, not this one; `catalog` only
 * reads today (seed data is inserted directly via the seed script, not
 * through this module's services).
 */
@Module({
  controllers: [CatalogController],
  providers: [ArtistsService, AlbumsService, TracksService],
  exports: [ArtistsService, AlbumsService, TracksService],
})
export class CatalogModule {}

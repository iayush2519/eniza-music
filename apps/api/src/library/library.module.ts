import { Module } from '@nestjs/common';

import { LibraryController } from './library.controller';
import { LibraryEntriesService } from './library-entries.service';
import { PlaylistTracksService } from './playlist-tracks.service';
import { PlaylistsService } from './playlists.service';

/**
 * A user's playlists, likes, and follows — the many-to-many relationships
 * between users and catalog entities. Every route in this module requires
 * auth (see `LibraryController`); there is no public read surface here,
 * unlike `CatalogModule`.
 */
@Module({
  controllers: [LibraryController],
  providers: [PlaylistsService, PlaylistTracksService, LibraryEntriesService],
  exports: [PlaylistsService, PlaylistTracksService, LibraryEntriesService],
})
export class LibraryModule {}

import { Injectable } from '@nestjs/common';

import {
  MusicProvider,
  ProviderAlbum,
  ProviderArtist,
  ProviderSearchResult,
  ProviderTrack,
  ResolvedStream,
  SearchOptions,
} from './music-provider.interface';

/**
 * A small, curated, in-memory "provider" used as the default in tests and
 * local development, before a real external provider (Jamendo — see
 * docs/architecture/music-provider-architecture.md) is wired in. Lets
 * every module built against `MusicProvider` (the future `MusicGateway`,
 * search, playback, recommendations) be built and tested against a
 * stable, fast, offline-friendly fake first, independent of a real
 * provider's auth, rate limits, or network variability.
 *
 * Audio URLs point at SoundHelix's freely-licensed sample MP3s
 * (https://www.soundhelix.com/audio-examples), the same source used by
 * the (now-retired) Phase 4 seed script, since it's a genuinely
 * legally-clean source of playable placeholder audio.
 */
@Injectable()
export class MockProvider implements MusicProvider {
  readonly providerId = 'mock';

  private static readonly SOUNDHELIX_BASE_URL = 'https://www.soundhelix.com/examples/mp3';

  private static readonly ARTISTS: ProviderArtist[] = [
    { providerId: 'mock', externalId: 'artist-1', name: 'Mara Lindqvist', imageUrl: null },
    { providerId: 'mock', externalId: 'artist-2', name: 'Julian Ferro', imageUrl: null },
    { providerId: 'mock', externalId: 'artist-3', name: 'Nadia Okafor', imageUrl: null },
  ];

  private static readonly ALBUMS: ProviderAlbum[] = [
    {
      providerId: 'mock',
      externalId: 'album-1',
      title: 'Slow Static',
      artistName: 'Mara Lindqvist',
      artistExternalId: 'artist-1',
      artworkUrl: null,
      releasedAt: '2025-03-14',
    },
    {
      providerId: 'mock',
      externalId: 'album-2',
      title: 'Low Tide Radio',
      artistName: 'Julian Ferro',
      artistExternalId: 'artist-2',
      artworkUrl: null,
      releasedAt: '2024-09-02',
    },
    {
      providerId: 'mock',
      externalId: 'album-3',
      title: 'Amber Hour',
      artistName: 'Nadia Okafor',
      artistExternalId: 'artist-3',
      artworkUrl: null,
      releasedAt: '2026-01-20',
    },
  ];

  private static readonly TRACKS: ProviderTrack[] = [
    {
      providerId: 'mock',
      externalId: 'track-1',
      title: 'Slow Static',
      artistName: 'Mara Lindqvist',
      artistExternalId: 'artist-1',
      albumTitle: 'Slow Static',
      albumExternalId: 'album-1',
      durationSeconds: 244,
      artworkUrl: null,
    },
    {
      providerId: 'mock',
      externalId: 'track-2',
      title: 'Glass Weather',
      artistName: 'Mara Lindqvist',
      artistExternalId: 'artist-1',
      albumTitle: 'Slow Static',
      albumExternalId: 'album-1',
      durationSeconds: 259,
      artworkUrl: null,
    },
    {
      providerId: 'mock',
      externalId: 'track-3',
      title: 'Low Tide Radio',
      artistName: 'Julian Ferro',
      artistExternalId: 'artist-2',
      albumTitle: 'Low Tide Radio',
      albumExternalId: 'album-2',
      durationSeconds: 231,
      artworkUrl: null,
    },
    {
      providerId: 'mock',
      externalId: 'track-4',
      title: 'Concrete Weather',
      artistName: 'Julian Ferro',
      artistExternalId: 'artist-2',
      albumTitle: 'Low Tide Radio',
      albumExternalId: 'album-2',
      durationSeconds: 267,
      artworkUrl: null,
    },
    {
      providerId: 'mock',
      externalId: 'track-5',
      title: 'Amber Hour',
      artistName: 'Nadia Okafor',
      artistExternalId: 'artist-3',
      albumTitle: 'Amber Hour',
      albumExternalId: 'album-3',
      durationSeconds: 252,
      artworkUrl: null,
    },
  ];

  search(query: string, options?: SearchOptions): Promise<ProviderSearchResult> {
    const normalizedQuery = query.trim().toLowerCase();
    const limit = options?.limit ?? 20;
    const type = options?.type;

    const matches = (text: string) => text.toLowerCase().includes(normalizedQuery);

    const tracks =
      type && type !== 'track'
        ? []
        : MockProvider.TRACKS.filter(
            (track) => matches(track.title) || matches(track.artistName),
          ).slice(0, limit);

    const albums =
      type && type !== 'album'
        ? []
        : MockProvider.ALBUMS.filter(
            (album) => matches(album.title) || matches(album.artistName),
          ).slice(0, limit);

    const artists =
      type && type !== 'artist'
        ? []
        : MockProvider.ARTISTS.filter((artist) => matches(artist.name)).slice(0, limit);

    return Promise.resolve({ tracks, albums, artists });
  }

  getTrack(externalId: string): Promise<ProviderTrack | null> {
    return Promise.resolve(
      MockProvider.TRACKS.find((track) => track.externalId === externalId) ?? null,
    );
  }

  getAlbum(externalId: string): Promise<ProviderAlbum | null> {
    return Promise.resolve(
      MockProvider.ALBUMS.find((album) => album.externalId === externalId) ?? null,
    );
  }

  getArtist(externalId: string): Promise<ProviderArtist | null> {
    return Promise.resolve(
      MockProvider.ARTISTS.find((artist) => artist.externalId === externalId) ?? null,
    );
  }

  async resolveStreamUrl(externalId: string): Promise<ResolvedStream> {
    const track = await this.getTrack(externalId);
    if (!track) {
      throw new Error(`MockProvider: unknown track externalId "${externalId}"`);
    }

    // Deterministic mapping from track number (track-1..track-5) to one of
    // SoundHelix's numbered sample files, so every mock track is genuinely
    // playable audio, not a dummy URL.
    const trackNumber = MockProvider.TRACKS.findIndex((t) => t.externalId === externalId) + 1;
    return {
      url: `${MockProvider.SOUNDHELIX_BASE_URL}/SoundHelix-Song-${trackNumber}.mp3`,
      expiresAt: null,
    };
  }

  async getRelatedTracks(externalId: string): Promise<ProviderTrack[]> {
    const track = await this.getTrack(externalId);
    if (!track) {
      return [];
    }

    return MockProvider.TRACKS.filter(
      (candidate) =>
        candidate.externalId !== externalId &&
        candidate.artistExternalId === track.artistExternalId,
    );
  }
}

import { MockProvider } from './mock-provider';

describe('MockProvider', () => {
  const provider = new MockProvider();

  describe('search', () => {
    it('matches tracks and artists by a case-insensitive substring', async () => {
      const result = await provider.search('mara');
      expect(result.tracks.every((track) => track.artistName === 'Mara Lindqvist')).toBe(true);
      expect(result.artists).toEqual([expect.objectContaining({ name: 'Mara Lindqvist' })]);
    });

    it('returns empty result sets for a query that matches nothing', async () => {
      const result = await provider.search('no-such-artist-or-track');
      expect(result).toEqual({ tracks: [], albums: [], artists: [] });
    });

    it('restricts results to the requested entity type', async () => {
      const result = await provider.search('mara', { type: 'artist' });
      expect(result.tracks).toEqual([]);
      expect(result.albums).toEqual([]);
      expect(result.artists).toHaveLength(1);
    });

    it('caps results at the requested limit', async () => {
      const result = await provider.search('a', { type: 'track', limit: 1 });
      expect(result.tracks).toHaveLength(1);
    });
  });

  describe('getTrack / getAlbum / getArtist', () => {
    it('returns the matching track by externalId', async () => {
      const track = await provider.getTrack('track-1');
      expect(track).toMatchObject({ externalId: 'track-1', title: 'Slow Static' });
    });

    it('returns null for an unknown track id', async () => {
      await expect(provider.getTrack('does-not-exist')).resolves.toBeNull();
    });

    it('returns the matching album by externalId', async () => {
      const album = await provider.getAlbum('album-2');
      expect(album).toMatchObject({ externalId: 'album-2', title: 'Low Tide Radio' });
    });

    it('returns null for an unknown album id', async () => {
      await expect(provider.getAlbum('does-not-exist')).resolves.toBeNull();
    });

    it('returns the matching artist by externalId', async () => {
      const artist = await provider.getArtist('artist-3');
      expect(artist).toMatchObject({ externalId: 'artist-3', name: 'Nadia Okafor' });
    });

    it('returns null for an unknown artist id', async () => {
      await expect(provider.getArtist('does-not-exist')).resolves.toBeNull();
    });
  });

  describe('resolveStreamUrl', () => {
    it('returns a playable URL for a known track', async () => {
      const stream = await provider.resolveStreamUrl('track-1');
      expect(stream.url).toMatch(/^https:\/\/www\.soundhelix\.com\/.*\.mp3$/);
      expect(stream.expiresAt).toBeNull();
    });

    it('rejects for an unknown track', async () => {
      await expect(provider.resolveStreamUrl('does-not-exist')).rejects.toThrow();
    });
  });

  describe('getRelatedTracks', () => {
    it('returns other tracks by the same artist, excluding the track itself', async () => {
      const related = await provider.getRelatedTracks('track-1');
      expect(related).toHaveLength(1);
      expect(related[0]).toMatchObject({ externalId: 'track-2', artistExternalId: 'artist-1' });
    });

    it('returns an empty array for an unknown track', async () => {
      await expect(provider.getRelatedTracks('does-not-exist')).resolves.toEqual([]);
    });
  });
});

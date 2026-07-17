import { ConfigService } from '@nestjs/config';

import { JamendoProvider } from './jamendo-provider';
import { EnvironmentVariables } from '../../config/env.validation';

/**
 * A minimal `ConfigService`-shaped stub — only the `.get()` calls
 * `JamendoProvider` actually makes are supported, avoiding a full Nest
 * `TestingModule` for what's otherwise a plain unit test with no other
 * dependencies.
 */
function createConfigStub(overrides: Partial<EnvironmentVariables> = {}) {
  const values: Partial<EnvironmentVariables> = {
    JAMENDO_CLIENT_ID: 'test-client-id',
    JAMENDO_API_BASE_URL: 'https://api.jamendo.com/v3.0',
    ...overrides,
  };

  return {
    get: (key: keyof EnvironmentVariables) => values[key],
  } as ConfigService<EnvironmentVariables, true>;
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const successHeaders = { status: 'success', code: 0, error_message: '' };

describe('JamendoProvider', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  describe('search', () => {
    it('normalizes track/album/artist results and queries all three by default', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            headers: successHeaders,
            results: [
              {
                id: '1',
                name: 'Track One',
                duration: 200,
                artist_id: '10',
                artist_name: 'Artist One',
                album_id: '20',
                album_name: 'Album One',
                album_image: 'https://example.com/album.jpg',
                image: null,
                audio: 'https://example.com/track.mp3',
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            headers: successHeaders,
            results: [
              {
                id: '20',
                name: 'Album One',
                artist_id: '10',
                artist_name: 'Artist One',
                image: 'https://example.com/album.jpg',
                releasedate: '2025-01-01',
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            headers: successHeaders,
            results: [{ id: '10', name: 'Artist One', image: null }],
          }),
        );

      const provider = new JamendoProvider(createConfigStub());
      const result = await provider.search('one');

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(result.tracks).toEqual([
        {
          providerId: 'jamendo',
          externalId: '1',
          title: 'Track One',
          artistName: 'Artist One',
          artistExternalId: '10',
          albumTitle: 'Album One',
          albumExternalId: '20',
          durationSeconds: 200,
          artworkUrl: 'https://example.com/album.jpg',
        },
      ]);
      expect(result.albums).toEqual([
        {
          providerId: 'jamendo',
          externalId: '20',
          title: 'Album One',
          artistName: 'Artist One',
          artistExternalId: '10',
          artworkUrl: 'https://example.com/album.jpg',
          releasedAt: '2025-01-01',
        },
      ]);
      expect(result.artists).toEqual([
        { providerId: 'jamendo', externalId: '10', name: 'Artist One', imageUrl: null },
      ]);
    });

    it('only queries the requested entity type', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ headers: successHeaders, results: [] }));

      const provider = new JamendoProvider(createConfigStub());
      await provider.search('one', { type: 'artist' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl] = fetchMock.mock.calls[0] as [URL];
      expect(calledUrl.pathname).toContain('/artists');
    });

    it('includes the client id and format on every request', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ headers: successHeaders, results: [] }));

      const provider = new JamendoProvider(createConfigStub());
      await provider.search('one', { type: 'track' });

      const [calledUrl] = fetchMock.mock.calls[0] as [URL];
      expect(calledUrl.searchParams.get('client_id')).toBe('test-client-id');
      expect(calledUrl.searchParams.get('format')).toBe('json');
      expect(calledUrl.searchParams.get('search')).toBe('one');
    });
  });

  describe('getTrack / getAlbum / getArtist', () => {
    it('returns null when Jamendo returns no results for an id lookup', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ headers: successHeaders, results: [] }));

      const provider = new JamendoProvider(createConfigStub());
      await expect(provider.getTrack('does-not-exist')).resolves.toBeNull();
    });
  });

  describe('resolveStreamUrl', () => {
    it('returns the track audio URL from Jamendo', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          headers: successHeaders,
          results: [
            {
              id: '1',
              name: 'Track One',
              duration: 200,
              artist_id: '10',
              artist_name: 'Artist One',
              album_id: null,
              album_name: null,
              album_image: null,
              image: null,
              audio: 'https://example.com/track.mp3',
            },
          ],
        }),
      );

      const provider = new JamendoProvider(createConfigStub());
      const stream = await provider.resolveStreamUrl('1');

      expect(stream).toEqual({ url: 'https://example.com/track.mp3', expiresAt: null });
    });

    it('throws when the track does not exist', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ headers: successHeaders, results: [] }));

      const provider = new JamendoProvider(createConfigStub());
      await expect(provider.resolveStreamUrl('does-not-exist')).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('throws when JAMENDO_CLIENT_ID is not configured', async () => {
      const provider = new JamendoProvider(createConfigStub({ JAMENDO_CLIENT_ID: undefined }));
      await expect(provider.getTrack('1')).rejects.toThrow(/JAMENDO_CLIENT_ID/);
    });

    it('throws on a non-ok HTTP response', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 500));

      const provider = new JamendoProvider(createConfigStub());
      await expect(provider.getTrack('1')).rejects.toThrow(/status 500/);
    });

    it('throws when the Jamendo API reports an error status', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          headers: { status: 'failed', code: 1, error_message: 'invalid client_id' },
          results: [],
        }),
      );

      const provider = new JamendoProvider(createConfigStub());
      await expect(provider.getTrack('1')).rejects.toThrow(/invalid client_id/);
    });
  });
});

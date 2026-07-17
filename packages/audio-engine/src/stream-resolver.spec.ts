import { resolveQueueItemStream } from './stream-resolver';
import type { QueueItem, StreamUrlProvider } from './types';

function createItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    trackId: 'track-1',
    title: 'Slow Static',
    artistName: 'Mara Lindqvist',
    artworkUrl: null,
    durationMs: 244_000,
    streamUrl: null,
    ...overrides,
  };
}

describe('resolveQueueItemStream', () => {
  it('returns a new QueueItem with streamUrl populated from the provider', async () => {
    const provider: StreamUrlProvider = {
      resolveStreamUrl: jest.fn().mockResolvedValue({
        url: 'https://example.com/stream.mp3',
        expiresAt: null,
      }),
    };
    const item = createItem();

    const resolved = await resolveQueueItemStream(provider, item);

    expect(resolved.streamUrl).toBe('https://example.com/stream.mp3');
    expect(provider.resolveStreamUrl).toHaveBeenCalledWith('track-1');
  });

  it('does not mutate the input item', async () => {
    const provider: StreamUrlProvider = {
      resolveStreamUrl: jest.fn().mockResolvedValue({
        url: 'https://example.com/stream.mp3',
        expiresAt: null,
      }),
    };
    const item = createItem();

    await resolveQueueItemStream(provider, item);

    expect(item.streamUrl).toBeNull();
  });

  it('propagates a rejection from the provider rather than swallowing it', async () => {
    const provider: StreamUrlProvider = {
      resolveStreamUrl: jest.fn().mockRejectedValue(new Error('not found')),
    };

    await expect(resolveQueueItemStream(provider, createItem())).rejects.toThrow('not found');
  });

  it('re-resolves on every call rather than caching a previous result', async () => {
    const resolveStreamUrl = jest
      .fn()
      .mockResolvedValueOnce({ url: 'https://example.com/first.mp3', expiresAt: null })
      .mockResolvedValueOnce({ url: 'https://example.com/second.mp3', expiresAt: null });
    const provider: StreamUrlProvider = { resolveStreamUrl };
    const item = createItem();

    const first = await resolveQueueItemStream(provider, item);
    const second = await resolveQueueItemStream(provider, item);

    expect(first.streamUrl).toBe('https://example.com/first.mp3');
    expect(second.streamUrl).toBe('https://example.com/second.mp3');
    expect(resolveStreamUrl).toHaveBeenCalledTimes(2);
  });
});

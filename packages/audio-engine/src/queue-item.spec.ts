import { toQueueItem } from './queue-item';

describe('toQueueItem', () => {
  const track = {
    id: 'track-1',
    title: 'Slow Static',
    durationSeconds: 244,
    coverArtUrl: 'https://example.com/cover.jpg',
  };

  it('maps a track into a QueueItem with streamUrl left unresolved', () => {
    const item = toQueueItem(track, 'Mara Lindqvist');

    expect(item).toEqual({
      trackId: 'track-1',
      title: 'Slow Static',
      artistName: 'Mara Lindqvist',
      artworkUrl: 'https://example.com/cover.jpg',
      durationMs: 244_000,
      streamUrl: null,
    });
  });

  it('defaults artistName to null when not provided', () => {
    const item = toQueueItem(track);
    expect(item.artistName).toBeNull();
  });

  it('carries a null coverArtUrl through unchanged', () => {
    const item = toQueueItem({ ...track, coverArtUrl: null });
    expect(item.artworkUrl).toBeNull();
  });
});

import { parseDurationToMs } from './parse-duration';

describe('parseDurationToMs', () => {
  it.each([
    ['30s', 30 * 1000],
    ['15m', 15 * 60 * 1000],
    ['2h', 2 * 60 * 60 * 1000],
    ['30d', 30 * 24 * 60 * 60 * 1000],
  ])('parses "%s" as %d ms', (input, expectedMs) => {
    expect(parseDurationToMs(input)).toBe(expectedMs);
  });

  it('throws on an invalid format', () => {
    expect(() => parseDurationToMs('not-a-duration')).toThrow();
  });

  it('throws on a missing unit', () => {
    expect(() => parseDurationToMs('30')).toThrow();
  });

  it('throws on an unsupported unit', () => {
    expect(() => parseDurationToMs('30w')).toThrow();
  });
});

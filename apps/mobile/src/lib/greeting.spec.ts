import { getHomeGreeting } from './greeting';

describe('getHomeGreeting', () => {
  it.each([
    [0, 'Good night'],
    [4, 'Good night'],
    [5, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [16, 'Good afternoon'],
    [17, 'Good evening'],
    [20, 'Good evening'],
    [21, 'Good night'],
    [23, 'Good night'],
  ])('returns %s for hour %i', (hour, expected) => {
    expect(getHomeGreeting(hour)).toBe(expected);
  });
});

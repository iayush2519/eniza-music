import { useSleepTimerStore } from './sleep-timer-store';

describe('useSleepTimerStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Cancel any timer left running by a previous test — this store is
    // module-level singleton state (matching `usePlaybackStore`'s own
    // pattern), so it does not reset itself between tests the way a
    // fresh hook instance would.
    useSleepTimerStore.getState().cancel();
  });

  afterEach(() => {
    useSleepTimerStore.getState().cancel();
    jest.useRealTimers();
  });

  it('starts with no active timer and the sheet hidden', () => {
    expect(useSleepTimerStore.getState()).toMatchObject({
      isSheetVisible: false,
      minutesRemaining: null,
    });
  });

  it('showSheet/hideSheet toggle sheet visibility without touching the timer', () => {
    useSleepTimerStore.getState().showSheet();
    expect(useSleepTimerStore.getState().isSheetVisible).toBe(true);

    useSleepTimerStore.getState().hideSheet();
    expect(useSleepTimerStore.getState().isSheetVisible).toBe(false);
  });

  it('set() starts a countdown, hides the sheet, and does not call onExpire yet', () => {
    const onExpire = jest.fn();
    useSleepTimerStore.getState().showSheet();

    useSleepTimerStore.getState().set(15, onExpire);

    expect(useSleepTimerStore.getState()).toMatchObject({
      minutesRemaining: 15,
      isSheetVisible: false,
    });
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('counts down minute-by-minute as time elapses', () => {
    const onExpire = jest.fn();
    useSleepTimerStore.getState().set(2, onExpire);

    jest.advanceTimersByTime(60_000);
    expect(useSleepTimerStore.getState().minutesRemaining).toBe(1);

    jest.advanceTimersByTime(60_000 - 1000);
    expect(useSleepTimerStore.getState().minutesRemaining).toBe(1);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('calls onExpire and clears minutesRemaining once the countdown reaches zero', () => {
    const onExpire = jest.fn();
    useSleepTimerStore.getState().set(1, onExpire);

    jest.advanceTimersByTime(60_000);

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(useSleepTimerStore.getState().minutesRemaining).toBeNull();
  });

  it('cancel() stops the countdown and clears the sheet before it would have expired', () => {
    const onExpire = jest.fn();
    useSleepTimerStore.getState().set(30, onExpire);

    useSleepTimerStore.getState().cancel();
    jest.advanceTimersByTime(30 * 60_000);

    expect(onExpire).not.toHaveBeenCalled();
    expect(useSleepTimerStore.getState()).toMatchObject({
      minutesRemaining: null,
      isSheetVisible: false,
    });
  });

  it('starting a new timer replaces an already-running one instead of stacking', () => {
    const firstExpire = jest.fn();
    const secondExpire = jest.fn();

    useSleepTimerStore.getState().set(1, firstExpire);
    useSleepTimerStore.getState().set(5, secondExpire);

    jest.advanceTimersByTime(60_000);

    // The first timer's own expiry never fires — it was replaced, not
    // left running alongside the second one.
    expect(firstExpire).not.toHaveBeenCalled();
    expect(secondExpire).not.toHaveBeenCalled();
    expect(useSleepTimerStore.getState().minutesRemaining).toBe(4);
  });

  it('survives being read from outside any component lifecycle (module-level state, not a hook)', () => {
    // This is the actual regression this store fixes: unlike a
    // component-local hook, `getState()` here works — and keeps ticking
    // — with zero React components mounted at all.
    const onExpire = jest.fn();
    useSleepTimerStore.getState().set(3, onExpire);

    jest.advanceTimersByTime(3 * 60_000);

    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});

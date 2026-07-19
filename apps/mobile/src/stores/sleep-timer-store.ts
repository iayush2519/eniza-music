import { create } from 'zustand';

const TICK_INTERVAL_MS = 1000;

type SleepTimerState = {
  isSheetVisible: boolean;
  /** Whole minutes left on an active timer, or `null` if none is set. */
  minutesRemaining: number | null;
  showSheet: () => void;
  hideSheet: () => void;
  /** Starts a countdown for `minutes`, calling `onExpire` once it
   * reaches zero. `onExpire` is passed in per-call (rather than fixed
   * at store-creation time) so the caller decides what "expire" means
   * (pausing the current `usePlaybackStore`) without this store having
   * to import/depend on that one. */
  set: (minutes: number, onExpire: () => void) => void;
  cancel: () => void;
};

let secondsRemaining = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;

function clearTimer(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * "Sleep Timer" per Phase 5's scope — a plain countdown owned entirely
 * on the JS side (`setInterval`, not a native engine capability): the
 * `PlaybackEngine` contract has no concept of a scheduled stop, and
 * adding one there would mean the engine reaching into UI-level
 * scheduling concerns it has no other reason to know about.
 *
 * A Zustand store, not a plain `useSleepTimer()` hook local to
 * `PlayerScreen` (an earlier version of this feature) — that was a real
 * bug: a hook's `setInterval` lives inside that component's own
 * lifecycle, so the instant a user backs out of the Full Player (the
 * entire point of a sleep timer is to let it keep counting down while
 * doing something else, e.g. going back to browse, or backgrounding the
 * app to fall asleep), the component unmounted, the hook's cleanup
 * effect fired, and the timer was silently destroyed with no warning —
 * the music would just keep playing all night. Moving the interval here
 * (module-level state, exactly like `usePlaybackStore` mirrors the
 * engine's own module-level native state) means the countdown survives
 * navigation the same way playback itself does; `PlayerScreen`'s sheet
 * is just one UI that happens to read/control it, not the thing that
 * owns it.
 */
export const useSleepTimerStore = create<SleepTimerState>((set) => ({
  isSheetVisible: false,
  minutesRemaining: null,

  showSheet: () => set({ isSheetVisible: true }),
  hideSheet: () => set({ isSheetVisible: false }),

  set: (minutes, onExpire) => {
    clearTimer();
    secondsRemaining = minutes * 60;
    set({ minutesRemaining: minutes, isSheetVisible: false });

    intervalId = setInterval(() => {
      secondsRemaining -= 1;
      if (secondsRemaining <= 0) {
        clearTimer();
        set({ minutesRemaining: null });
        onExpire();
        return;
      }
      set({ minutesRemaining: Math.ceil(secondsRemaining / 60) });
    }, TICK_INTERVAL_MS);
  },

  cancel: () => {
    clearTimer();
    set({ minutesRemaining: null, isSheetVisible: false });
  },
}));

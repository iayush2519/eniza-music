import { useEffect, useRef, useState } from 'react';

const TICK_INTERVAL_MS = 1000;

export type UseSleepTimerResult = {
  isSheetVisible: boolean;
  /** Whole minutes left on an active timer, or `null` if none is set. */
  minutesRemaining: number | null;
  showSheet: () => void;
  hideSheet: () => void;
  set: (minutes: number) => void;
  cancel: () => void;
};

/**
 * "Sleep Timer" per Phase 5's scope — a plain countdown owned entirely
 * on the JS side (`setInterval`, not a native engine capability): the
 * `PlaybackEngine` contract has no concept of a scheduled stop, and
 * adding one there would mean the engine reaching into UI-level
 * scheduling concerns it has no other reason to know about. Firing
 * `onExpire` (which the caller wires to `pause()`) is a plain timeout —
 * exactly as reliable as any other JS timer while the app is foregrounded,
 * which matches this feature's real-world usage (falling asleep with the
 * app open), not a background-service-level guarantee.
 */
export function useSleepTimer(onExpire: () => void): UseSleepTimerResult {
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
  const secondsRemainingRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  return {
    isSheetVisible,
    minutesRemaining,
    showSheet: () => setIsSheetVisible(true),
    hideSheet: () => setIsSheetVisible(false),
    set: (minutes) => {
      clearTimer();
      secondsRemainingRef.current = minutes * 60;
      setMinutesRemaining(minutes);
      setIsSheetVisible(false);

      intervalRef.current = setInterval(() => {
        secondsRemainingRef.current -= 1;
        if (secondsRemainingRef.current <= 0) {
          clearTimer();
          setMinutesRemaining(null);
          onExpire();
          return;
        }
        setMinutesRemaining(Math.ceil(secondsRemainingRef.current / 60));
      }, TICK_INTERVAL_MS);
    },
    cancel: () => {
      clearTimer();
      setMinutesRemaining(null);
      setIsSheetVisible(false);
    },
  };
}

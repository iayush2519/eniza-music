import { useEffect, useState } from 'react';

/**
 * Keeps a modal/overlay mounted for `exitDurationMs` after `visible`
 * flips to `false`, so its own exit animation (a fade, a slide-down) has
 * time to actually play before the component unmounts — without this,
 * a controlled `visible`/`onDismiss` component (`ConfirmDialog`,
 * `ContextMenu`, `Toast`) renders `null` the instant its parent flips
 * `visible` off, and any exit-animation code becomes dead code: the
 * animated node is already gone from the tree before Reanimated can run
 * a single frame of it. This was a real gap in Phase 2's `Toast` (its
 * exit animation never visibly played for exactly this reason), fixed
 * here as a shared hook so every dismissible overlay gets a working exit
 * transition instead of each one needing its own ad hoc timer.
 */
export function useDeferredVisibility(visible: boolean, exitDurationMs: number): boolean {
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      // Synchronizes with the "should this overlay be mounted" external
      // condition (`visible`, driven by a parent's own state) — the same
      // documented escape hatch `use-color-scheme.web.ts` uses for
      // syncing with the client-hydration condition, not a case of
      // computing derived state from props.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldRender(true);
      return undefined;
    }

    const timer = setTimeout(() => setShouldRender(false), exitDurationMs);
    return () => clearTimeout(timer);
  }, [visible, exitDurationMs]);

  return shouldRender;
}

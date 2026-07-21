'use client';

import { useEffect, useState } from 'react';

/**
 * Web equivalent of
 * packages/design-system/src/theme/use-reduced-motion.ts (which wraps
 * React Native's `AccessibilityInfo` and can't run in a DOM
 * environment) — same purpose, "respect prefers-reduced-motion"
 * (docs/architecture/design-system.md's accessibility rules), reimplemented
 * against the `matchMedia` API this app actually runs on instead of
 * importing the RN-only package.
 */
function getInitialPreference(): boolean {
  // Read synchronously during render (not in an effect + setState, which
  // the react-hooks lint rule flags as a cascading-render smell) — safe
  // here because this hook is only ever called from 'use client'
  // components, but still guarded for the SSR pass where `window` isn't
  // defined yet.
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useReducedMotion(): boolean {
  const [isReducedMotion, setIsReducedMotion] = useState(getInitialPreference);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => setIsReducedMotion(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return isReducedMotion;
}

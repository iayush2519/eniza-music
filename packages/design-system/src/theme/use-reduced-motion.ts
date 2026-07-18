import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the OS-level "reduce motion" accessibility setting is enabled.
 * Centralized here (rather than each animated component polling
 * `AccessibilityInfo` itself) so every component that needs to respect
 * this setting shares one subscription pattern — see
 * docs/architecture/design-system.md's accessibility rules: "Respect
 * prefers-reduced-motion."
 */
export function useReducedMotion(): boolean {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (isMounted) {
        setIsReducedMotion(value);
      }
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setIsReducedMotion);
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return isReducedMotion;
}

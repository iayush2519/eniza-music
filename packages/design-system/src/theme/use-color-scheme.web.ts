import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * On web, Expo Router performs static rendering, so the very first render
 * happens with no knowledge of the client's actual color scheme
 * preference. Returning a fixed 'light' value until after hydration avoids
 * a light/dark flash and a server/client markup mismatch.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // Intentionally synchronizes with the "are we on the client yet"
    // external condition — the documented escape hatch for this rule, not
    // a case of computing derived state from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}

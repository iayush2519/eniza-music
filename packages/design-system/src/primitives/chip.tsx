import { StyleSheet, type PressableProps } from 'react-native';

import { PressableScale } from './pressable-scale';
import { Text } from './text';
import { useTheme } from '../theme/theme-provider';

export type ChipProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  /** Filled with `accentMuted` when true, `surface` otherwise. */
  selected?: boolean;
};

/**
 * A small rounded tag — used for genre/category labels (e.g. "Alternative
 * Rock") and filter selections, per the "Chip" entry in the approved UI
 * board's Visual Component Library. Built on `PressableScale` so tapping
 * a chip gives the same tactile scale/dim feedback as every other
 * tappable surface in the app — Phase 2's version had no press feedback
 * at all.
 */
export function Chip({ label, selected = false, accessibilityRole = 'button', ...rest }: ChipProps) {
  const theme = useTheme();

  return (
    <PressableScale
      scaleTo={0.94}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ selected }}
      style={[
        styles.base,
        {
          backgroundColor: selected ? theme.colors.accentMuted : theme.colors.surface,
          borderRadius: theme.radii.full,
          borderWidth: selected ? 0 : 1,
          borderColor: theme.colors.border,
        },
      ]}
      {...rest}>
      <Text variant="caption" color={selected ? 'text' : 'textSecondary'}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
});

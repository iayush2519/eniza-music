import { StyleSheet, View } from 'react-native';

import { Text } from './text';
import { useTheme } from '../theme/theme-provider';
import { ColorRole } from '../tokens/colors';

export type BadgeProps = {
  /** A short count/status label (e.g. "3", "New"). Omit for a plain dot. */
  label?: string;
  color?: ColorRole;
};

/**
 * A small pill/dot indicator — "Badges" in the approved UI board's Visual
 * Component Library. Used standalone (e.g. a genre tag count) or composed
 * inside `Avatar`'s `badge` prop for a notification dot.
 */
export function Badge({ label, color = 'accent' }: BadgeProps) {
  const theme = useTheme();

  if (!label) {
    return (
      <View style={[styles.dot, { backgroundColor: theme.colors[color] }]} accessibilityElementsHidden />
    );
  }

  return (
    <View
      style={[styles.pill, { backgroundColor: theme.colors[color], borderRadius: theme.radii.full }]}>
      <Text variant="caption" color="textOnAccent" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pill: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    includeFontPadding: false,
  },
});

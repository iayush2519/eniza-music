import { HStack, IconButton, Surface, Text, VStack, type IconName } from '@music-app/design-system';
import { StyleSheet } from 'react-native';

export type QuickAction = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
};

export type QuickActionsProps = {
  actions: readonly QuickAction[];
};

/**
 * "Quick Actions" per Phase 4's objectives — a horizontal row of
 * icon+label shortcuts (e.g. jump straight to Search, Library, or an AI
 * feature once it exists) sitting just below the greeting. Built from
 * existing primitives (`Surface`, `IconButton`, `Text`) rather than a new
 * one-off component, matching the same reuse pattern every other Home
 * section already follows.
 */
export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <HStack gap="md">
      {actions.map((action) => (
        <VStack key={action.key} align="center" gap="xs" style={styles.action}>
          <Surface color="surface" radius="full" elevation="raised" style={styles.iconWrapper}>
            <IconButton
              name={action.icon}
              accessibilityLabel={action.label}
              onPress={action.onPress}
              variant="ghost"
            />
          </Surface>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {action.label}
          </Text>
        </VStack>
      ))}
    </HStack>
  );
}

const styles = StyleSheet.create({
  action: {
    flex: 1,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

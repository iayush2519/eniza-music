import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from './text';
import { useTheme } from '../theme/theme-provider';

export type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<AvatarSize, number> = { sm: 32, md: 48, lg: 64 };

export type AvatarProps = {
  /** Photo URL. Falls back to `initials` (or a generic person glyph) when absent. */
  source?: string | null;
  /** Shown when `source` is absent — typically the user/artist's first initial(s). */
  initials?: string;
  size?: AvatarSize;
  /**
   * Shows a small accent dot in the bottom-right corner — "Avatar, With
   * Badge" per docs/design/design-system-specification.md's component
   * inventory (used for online/verified/notification indicators).
   */
  badge?: boolean;
  accessibilityLabel?: string;
};

/**
 * The app's one circular profile-photo component (radius_pill, per spec
 * §0 — "CTA buttons, profile avatars"). Used for the current user's
 * profile photo and artist images across cards/headers.
 */
export function Avatar({ source, initials, size = 'md', badge = false, accessibilityLabel }: AvatarProps) {
  const theme = useTheme();
  const pixelSize = SIZE_PX[size];

  return (
    <View
      style={{ width: pixelSize, height: pixelSize }}
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image">
      {source ? (
        <Image
          source={source}
          style={[styles.image, { width: pixelSize, height: pixelSize, borderRadius: pixelSize / 2 }]}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: pixelSize,
              height: pixelSize,
              borderRadius: pixelSize / 2,
              backgroundColor: theme.colors.accentMuted,
            },
          ]}>
          <Text variant="label" color="text" style={styles.initials}>
            {initials?.slice(0, 2).toUpperCase() ?? ''}
          </Text>
        </View>
      )}
      {badge ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.colors.accent,
              borderColor: theme.colors.background,
              width: pixelSize * 0.3,
              height: pixelSize * 0.3,
              borderRadius: pixelSize * 0.15,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {},
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    includeFontPadding: false,
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    borderWidth: 2,
  },
});

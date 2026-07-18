import { Avatar, HStack, IconButton, PressableScale, Text } from '@music-app/design-system';
import { StyleSheet, View } from 'react-native';

export type HeaderProps =
  | {
      /** The top-of-tab-stack wordmark header — "Header, Home" per
       * docs/design/design-system-specification.md's component
       * inventory ("Main application top navigation with
       * branding/icons"). */
      variant?: 'home';
      onSearchPress?: () => void;
      onAvatarPress?: () => void;
      avatarUrl?: string | null;
      avatarInitials?: string;
    }
  | {
      /** The pushed-screen detail header — "Header, Detail View" per the
       * same inventory entry (back arrow + title, optional trailing
       * action). */
      variant: 'detail';
      title: string;
      onBackPress: () => void;
      onActionPress?: () => void;
      actionAccessibilityLabel?: string;
    };

/**
 * The app's one top-navigation header, in the two variants the approved
 * component inventory names ("Home" and "Detail View"). Kept as a single
 * component with a `variant` union — matching how `Button`/`AlbumCard`
 * already use a `variant` prop for their own approved variant sets —
 * rather than two separate components, since both share the same 56px
 * horizontal bar shape and only their content differs.
 */
export function Header(props: HeaderProps) {
  if (props.variant === 'detail') {
    return (
      <HStack align="center" justify="space-between" style={styles.bar}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={props.onBackPress} />
        <Text variant="title" numberOfLines={1} style={styles.detailTitle}>
          {props.title}
        </Text>
        {props.onActionPress ? (
          <IconButton
            name="more-vertical"
            accessibilityLabel={props.actionAccessibilityLabel ?? 'More options'}
            onPress={props.onActionPress}
          />
        ) : (
          <View style={styles.actionPlaceholder} />
        )}
      </HStack>
    );
  }

  return (
    <HStack align="center" justify="space-between" style={styles.bar}>
      <Text variant="displayMedium">Eniza</Text>
      <HStack gap="sm" align="center">
        <IconButton name="search" accessibilityLabel="Search" onPress={props.onSearchPress} />
        <PressableScale
          scaleTo={0.92}
          onPress={props.onAvatarPress}
          disabled={!props.onAvatarPress}
          accessibilityRole={props.onAvatarPress ? 'button' : undefined}>
          <Avatar
            source={props.avatarUrl}
            initials={props.avatarInitials}
            size="sm"
            accessibilityLabel="Profile"
          />
        </PressableScale>
      </HStack>
    </HStack>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  detailTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  actionPlaceholder: {
    width: 40,
    height: 40,
  },
});

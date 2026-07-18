import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';
import { useTheme } from '../theme/theme-provider';

export type EmptyStateProps = {
  icon: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * A full-width placeholder for missing content — "EmptyState" per
 * docs/design/design-system-specification.md's component inventory
 * ("Full screen or widget placeholder... Library, Home, Download") and
 * state-management table ("Used when content list is null or 0 length").
 *
 * The approved UI board's Global Calm States use custom illustrations
 * (an offline cloud graphic, a server-error graphic); no illustration
 * assets exist in the repo and none were supplied with the approved
 * documents (see Phase 1's Known Issues for the same gap on fonts) — per
 * this project's standing "do not generate/invent assets" rule, this
 * renders a themed `Icon` inside a soft accent-tinted circle instead of a
 * missing illustration, using the same visual language (soft rose glow
 * behind a centered glyph) the board's calm states share. Swapping in the
 * real illustrations later is a one-line change inside this component.
 */
export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapper, { backgroundColor: theme.colors.accentMuted }]}>
        <Icon name={icon} size="lg" color="accent" />
      </View>
      <Text variant="title" style={styles.centerText}>
        {title}
      </Text>
      {description ? (
        <Text variant="label" color="textSecondary" style={styles.centerText}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button onPress={onAction}>{actionLabel}</Button>
        </View>
      ) : null}
    </View>
  );
}

/** A themed drop-in for `EmptyState`'s "Offline" state — "OfflineBanner"
 * per the same component inventory ("Global banner informing user of
 * disconnected status"). Actual connectivity detection (e.g.
 * `@react-native-community/netinfo`) isn't wired in this phase — no such
 * dependency exists anywhere in the repo yet, and adding a new native
 * dependency is a decision for the screen that first needs it, not this
 * primitive. This component only renders the visual; the caller decides
 * when `visible` is true. */
export type OfflineBannerProps = { visible: boolean };

export function OfflineBanner({ visible }: OfflineBannerProps) {
  const theme = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.surfacePressed }]}>
      <Icon name="wifi-off" size="sm" color="textSecondary" accessibilityLabel="Offline" />
      <Text variant="caption" color="textSecondary">
        You&apos;re offline. Some content may be unavailable.
      </Text>
    </View>
  );
}

export type ErrorStateProps = {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  children?: ReactNode;
};

/** A themed full-width error placeholder — "ErrorToast"/"Error
 * illustration in state containers" per the state-management table's
 * Error row, used for whole-screen/section failures (as opposed to
 * `Toast`, which is for transient action feedback). */
export function ErrorState({ title = 'Something went wrong', description, retryLabel = 'Retry', onRetry }: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapper, { backgroundColor: theme.colors.surfacePressed }]}>
        <Icon name="alert-triangle" size="lg" color="danger" />
      </View>
      <Text variant="title" style={styles.centerText}>
        {title}
      </Text>
      {description ? (
        <Text variant="label" color="textSecondary" style={styles.centerText}>
          {description}
        </Text>
      ) : null}
      {onRetry ? (
        <View style={styles.action}>
          <Button variant="secondary" onPress={onRetry}>
            {retryLabel}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  centerText: {
    textAlign: 'center',
  },
  action: {
    marginTop: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});

import { Button, EqualizerGlyph, Icon, Surface, Text, useReducedMotion, useTheme, VStack } from '@music-app/design-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth } from '@/constants/layout';

type Outcome = 'verified' | 'password-reset' | 'error';

const OUTCOME_CONTENT: Record<
  Outcome,
  { icon: 'check' | 'alert-triangle'; title: string; description: string; actionLabel: string }
> = {
  verified: {
    icon: 'check',
    title: 'Account Verified',
    description: 'You\u2019re all set. Welcome to Eniza.',
    actionLabel: 'Get Started',
  },
  'password-reset': {
    icon: 'check',
    title: 'Password Updated',
    description: 'Your password has been changed. Sign in with your new password.',
    actionLabel: 'Back to Sign In',
  },
  error: {
    icon: 'alert-triangle',
    title: 'Something went wrong',
    description: 'We couldn\u2019t complete that action. Please try again.',
    actionLabel: 'Retry',
  },
};

/**
 * "Account Verified" / "Something went wrong" per the approved UI
 * board's Authentication Flow — a single, reusable success/error
 * confirmation screen driven by an `outcome` param, rather than a
 * separate route per outcome, since all three share the exact layout
 * (centered icon, title, description, single primary action) and only
 * the content and destination differ.
 */
export default function AuthResultScreen() {
  const { outcome = 'verified' } = useLocalSearchParams<{ outcome: Outcome }>();
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const content = OUTCOME_CONTENT[outcome] ?? OUTCOME_CONTENT.verified;
  const isError = outcome === 'error';

  const iconScale = useSharedValue(isReducedMotion ? 1 : 0);

  useEffect(() => {
    if (isReducedMotion) {
      iconScale.value = 1;
      return;
    }
    iconScale.value = withSequence(
      withTiming(1.15, { duration: 260, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: 140, easing: Easing.out(Easing.ease) }),
    );
  }, [isReducedMotion, iconScale]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));

  const handleAction = () => {
    if (isError) {
      router.back();
      return;
    }
    if (outcome === 'password-reset') {
      router.replace('/(auth)/login');
      return;
    }
    // 'verified': the account is already authenticated (register/login
    // issue tokens up front) and now also verified, so the root layout's
    // `isAuthenticated` guard (see apps/mobile/src/app/_layout.tsx) is
    // already satisfied -- navigating to any in-app route hands off to
    // (tabs) directly. `(tabs)/_layout.tsx`'s own verification check
    // would also allow this through now that `emailVerified` is true.
    router.replace('/(tabs)');
  };

  return (
    <Surface style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <VStack align="center" gap="lg">
          <Animated.View
            style={[
              styles.iconWrapper,
              { backgroundColor: isError ? theme.colors.surfacePressed : theme.colors.accentMuted },
              iconAnimatedStyle,
            ]}>
            <Icon name={content.icon} size="lg" color={isError ? 'danger' : 'accent'} />
          </Animated.View>

          <VStack align="center" gap="sm">
            <Text variant="title" style={styles.centerText}>
              {content.title}
            </Text>
            <Text variant="body" color="textSecondary" style={styles.centerText}>
              {content.description}
            </Text>
          </VStack>

          {!isError ? <EqualizerGlyph size={16} /> : null}
        </VStack>

        <View style={styles.actionArea}>
          <Button onPress={handleAction}>{content.actionLabel}</Button>
        </View>
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: 24,
    gap: 48,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  actionArea: {
    paddingBottom: 16,
  },
});

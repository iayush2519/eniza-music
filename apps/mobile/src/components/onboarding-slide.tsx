import { Icon, Text, VStack, useTheme, type IconName } from '@music-app/design-system';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

type OnboardingSlideProps = {
  icon: IconName;
  title: string;
  description: string;
};

/**
 * A single onboarding page: an accent-glow icon mark over a title and
 * description, sized to exactly one screen width so it composes cleanly
 * inside a paging horizontal scroll view. Kept as its own component
 * (rather than inlined in the screen) so it has no knowledge of paging,
 * navigation, or persistence — it only renders content, which is what
 * makes it independently reusable and testable.
 */
export function OnboardingSlide({ icon, title, description }: OnboardingSlideProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.page, { width }]}>
      <VStack align="center" gap="xxl">
        <View style={styles.markWrapper}>
          <LinearGradient
            colors={[theme.colors.accentMuted, 'transparent']}
            style={styles.glow}
          />
          <View
            style={[
              styles.markCircle,
              { backgroundColor: theme.colors.backgroundElevated, borderColor: theme.colors.border },
            ]}>
            <Icon name={icon} size="lg" color="accent" />
          </View>
        </View>

        <VStack align="center" gap="sm">
          <Text variant="displayMedium" style={styles.centerText}>
            {title}
          </Text>
          <Text variant="body" color="textSecondary" style={styles.centerText}>
            {description}
          </Text>
        </VStack>
      </VStack>
    </View>
  );
}

const MARK_SIZE = 96;
const GLOW_SIZE = 200;

const styles = StyleSheet.create({
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  markWrapper: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
  },
  markCircle: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: MARK_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
});

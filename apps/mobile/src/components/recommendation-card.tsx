import { PressableScale, Surface, Text, VStack } from '@music-app/design-system';
import type { RecommendationSection } from '@music-app/shared-types';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

export type RecommendationCardProps = {
  section: RecommendationSection;
  onPress?: () => void;
};

/**
 * The large, feature-level "hero" card at the top of Home — per the
 * approved UI board's "ENIZA Daily Soundscape" card and
 * docs/design/design-system-specification.md's "RecommendationCard,
 * Feature card with adaptable gradient and artwork" entry. radius_xxl
 * (28px, "Primary feature cards" per spec §0).
 *
 * Recommendation sections carry a list of tracks, not a single piece of
 * artwork of their own (see @music-app/shared-types), so the "adaptable
 * gradient" the spec calls for is rendered from the theme's own
 * accent/accentMuted pair rather than a per-section image — the same
 * blush/rose gradient the approved board uses behind onboarding and
 * splash content elsewhere in the app.
 */
export function RecommendationCard({ section, onPress }: RecommendationCardProps) {
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}>
      <Surface radius="xxl" elevation="raised" style={styles.card}>
        <LinearGradient
          colors={['#F5BDBD', '#E6A8A8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <VStack gap="xs">
          <Text variant="title" color="textOnAccent">
            {section.title}
          </Text>
          <Text variant="label" color="textOnAccent">
            {section.tracks.length} track{section.tracks.length === 1 ? '' : 's'}
          </Text>
        </VStack>
      </Surface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    minHeight: 140,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
});

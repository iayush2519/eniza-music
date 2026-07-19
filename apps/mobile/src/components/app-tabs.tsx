import { useTheme } from '@music-app/design-system';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function AppTabs() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.colors.background}
      // TabNavigator per docs/design/design-system-specification.md §1
      // ("Active (Accent), Inactive") — the active tab's icon/label must
      // read in the brand accent, not the same neutral gray as inactive
      // tabs. `iconColor`/`labelStyle` both take a `{ default, selected }`
      // pair for exactly this; the Android active-tab pill (`indicatorColor`)
      // is tinted with `accentMuted` (accent_rose, "secondary accent...
      // badges" per spec §0) so the accent-colored icon/label sitting on
      // top of it stays legible rather than accent-on-accent.
      iconColor={{ default: theme.colors.textSecondary, selected: theme.colors.accent }}
      indicatorColor={theme.colors.accentMuted}
      labelStyle={{
        default: { color: theme.colors.textSecondary },
        selected: { color: theme.colors.accent },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
        {/* No dedicated library icon exists yet — reusing explore's icon
            as a placeholder. Real iconography is a Phase 7 (motion &
            polish) concern per docs/roadmap.md, not introduced here. */}
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

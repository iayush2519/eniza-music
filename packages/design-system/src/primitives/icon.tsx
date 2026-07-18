import { Feather } from '@expo/vector-icons';
import { type ComponentProps } from 'react';

import { useTheme } from '../theme/theme-provider';
import { ColorRole } from '../tokens/colors';
import { IconSizeToken } from '../tokens/sizes';

/**
 * Feather is the app's one icon set (per
 * docs/architecture/design-system.md's icon guidelines: "one stroke
 * weight app-wide"). Feather's outline-only glyphs give a single,
 * consistent stroke weight for free — we don't have to curate a mix of
 * outline/filled styles from a larger set ourselves.
 */
export type IconName = ComponentProps<typeof Feather>['name'];

export type IconProps = {
  name: IconName;
  /** Size token. Defaults to `md` (24px). */
  size?: IconSizeToken;
  /** Color role. Defaults to `text` (primary foreground). */
  color?: ColorRole;
  /**
   * Required whenever the icon is the sole content of a tappable element
   * (per the accessibility rule: "every icon-only interactive element
   * requires accessibilityLabel"). Omit only when the icon is purely
   * decorative and sits alongside its own visible text label.
   */
  accessibilityLabel?: string;
};

/**
 * The app's only icon component. Centralizing the icon set and size scale
 * here means swapping icon libraries or resizing the whole app's
 * iconography is a one-file change, matching how `Text` centralizes type
 * scale and color.
 */
export function Icon({ name, size = 'md', color = 'text', accessibilityLabel }: IconProps) {
  const theme = useTheme();

  return (
    <Feather
      name={name}
      size={theme.iconSizes[size]}
      color={theme.colors[color]}
      accessibilityLabel={accessibilityLabel}
      accessible={accessibilityLabel !== undefined}
    />
  );
}

import { View, type ViewProps } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import { ColorRole } from '../tokens/colors';
import { RadiusToken } from '../tokens/radii';

export type SurfaceProps = ViewProps & {
  /**
   * Background color role. Defaults to `background` (the base app
   * background). Use `backgroundElevated`/`surface` for cards and rows.
   */
  color?: ColorRole;
  /** Corner radius token. Defaults to `none` (no rounding). */
  radius?: RadiusToken;
  /** Draw a hairline border using the `border` color role. */
  bordered?: boolean;
};

/**
 * The base building block for any themed rectangular area: cards, rows,
 * the mini-player, modal sheets. Anything that isn't plain text or a
 * button composes from `Surface` rather than reaching for a raw `View`
 * with an inline background color.
 */
export function Surface({
  color = 'background',
  radius = 'none',
  bordered = false,
  style,
  ...rest
}: SurfaceProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors[color],
          borderRadius: theme.radii[radius],
          borderWidth: bordered ? 1 : 0,
          borderColor: theme.colors.border,
        },
        style,
      ]}
      {...rest}
    />
  );
}

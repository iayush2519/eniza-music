import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import { ColorRole } from '../tokens/colors';
import { TypeScaleToken } from '../tokens/typography';

export type TextProps = RNTextProps & {
  /** Type-scale token controlling font size, line height, and weight. */
  variant?: TypeScaleToken;
  /** Color role. Defaults to `text` (primary foreground). */
  color?: ColorRole;
};

/**
 * The only text component the app should render. Centralizing font
 * family, type scale, and color role here means "make all body text
 * slightly larger" is a one-line token change, not a find-and-replace
 * across every screen.
 */
export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const theme = useTheme();
  const scale = theme.typeScale[variant];

  return (
    <RNText
      style={[
        styles.base,
        {
          color: theme.colors[color],
          fontFamily: theme.fontFamily?.sans,
          fontSize: scale.fontSize,
          lineHeight: scale.lineHeight,
          fontWeight: scale.fontWeight,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});

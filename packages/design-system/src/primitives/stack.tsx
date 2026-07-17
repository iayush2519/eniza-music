import { View, type ViewProps } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import { SpacingToken } from '../tokens/spacing';

type StackProps = ViewProps & {
  /** Gap between children, from the spacing scale. Defaults to `none`. */
  gap?: SpacingToken;
  /** Cross-axis alignment. Defaults to `stretch` (React Native default). */
  align?: 'stretch' | 'flex-start' | 'center' | 'flex-end';
  /** Main-axis distribution. Defaults to `flex-start`. */
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
};

/**
 * `VStack`/`HStack` are the app's only layout primitives for flex rows and
 * columns. They exist so spacing between siblings is always a token
 * (`gap="md"`), never a magic number, and so screen code reads as layout
 * intent rather than raw flexbox props.
 */
export function VStack({ gap = 'none', align, justify, style, ...rest }: StackProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'column',
          gap: theme.spacing[gap],
          alignItems: align,
          justifyContent: justify,
        },
        style,
      ]}
      {...rest}
    />
  );
}

export function HStack({ gap = 'none', align, justify, style, ...rest }: StackProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: theme.spacing[gap],
          alignItems: align,
          justifyContent: justify,
        },
        style,
      ]}
      {...rest}
    />
  );
}

import { useTheme } from '@music-app/design-system';
import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

/**
 * The only text input primitive used across auth screens. Styled from
 * design-system tokens (not local hex values) so it stays visually
 * consistent with everything else once real screens exist to compare it
 * against, per docs/architecture/design-system.md.
 */
export const TextField = forwardRef<TextInput, TextInputProps>(function TextField(props, ref) {
  const theme = useTheme();

  return (
    <TextInput
      ref={ref}
      placeholderTextColor={theme.colors.textTertiary}
      style={[
        styles.base,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.md,
          color: theme.colors.text,
          fontSize: theme.typeScale.body.fontSize,
        },
      ]}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});

import { Button, Surface, Text } from '@music-app/design-system';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextField } from '@/components/text-field';
import { MaxContentWidth } from '@/constants/layout';
import { useAuthStore } from '@/stores/auth-store';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const register = useAuthStore((state) => state.register);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const error = useAuthStore((state) => state.error);

  const canSubmit = email.length > 0 && password.length > 0 && displayName.length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    void register({ email, password, displayName });
  };

  return (
    <Surface style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safeArea}>
          <Text variant="title" style={styles.centerText}>
            Create your account
          </Text>

          <TextField
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            autoCapitalize="words"
            testID="register-display-name-input"
          />
          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            testID="register-email-input"
          />
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
            testID="register-password-input"
          />
          <Text variant="caption" color="textSecondary">
            At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
          </Text>

          {error ? (
            <Text color="danger" variant="label">
              {error}
            </Text>
          ) : null}

          <Button onPress={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>

          <Link href="/(auth)/login" asChild>
            <Text color="accent" variant="label" style={styles.centerText}>
              Already have an account? Sign in
            </Text>
          </Link>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: 24,
    gap: 16,
  },
  centerText: {
    textAlign: 'center',
  },
});

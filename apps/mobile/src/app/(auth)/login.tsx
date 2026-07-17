import { Button, Surface, Text } from '@music-app/design-system';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextField } from '@/components/text-field';
import { MaxContentWidth } from '@/constants/layout';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((state) => state.login);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const error = useAuthStore((state) => state.error);

  const canSubmit = email.length > 0 && password.length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    // Errors surface via the store's `error` field, rendered below —
    // intentionally not re-thrown/logged here.
    void login({ email, password });
  };

  return (
    <Surface style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safeArea}>
          <Text variant="title" style={styles.centerText}>
            Welcome back
          </Text>

          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            testID="login-email-input"
          />
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
            testID="login-password-input"
          />

          {error ? (
            <Text color="danger" variant="label">
              {error}
            </Text>
          ) : null}

          <Button onPress={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>

          <Link href="/(auth)/register" asChild>
            <Text color="accent" variant="label" style={styles.centerText}>
              Don&apos;t have an account? Create one
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

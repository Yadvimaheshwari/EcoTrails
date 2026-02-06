import React, { useState } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api, setAuthToken } from '../config/api';
import { useAuthStore } from '../store/useAuthStore';

export const LoginScreen: React.FC = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleSendMagicLink = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/v1/auth/magic-link', { email });
      Alert.alert(
        'Check your email',
        'We sent you a magic link to sign in. Click the link in your email to continue.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Failed to send magic link:', error);
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  // For development: allow skipping login
  const handleSkip = () => {
    // Create a mock user for development
    const mockUser = { id: 'dev-user', email: 'dev@ecotrails.app', name: 'Dev User' };
    const mockToken = 'dev-token';
    setAuth(mockUser, mockToken);
    // No manual navigation needed — App.tsx uses conditional rendering
    // and will automatically switch to MainTabs when user state is set.
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="h1" style={styles.title}>EcoTrails</Text>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              Your hiking companion
            </Text>
          </View>

          <Card style={styles.formCard}>
            <Text variant="h3" style={styles.formTitle}>Sign in</Text>
            <Text variant="body" color="secondary" style={styles.formDescription}>
              Enter your email to receive a magic link
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />

            <Button
              title={loading ? 'Sending...' : 'Send magic link'}
              onPress={handleSendMagicLink}
              disabled={loading || !email.trim()}
              size="lg"
              style={styles.submitButton}
            />

            {__DEV__ && (
              <Button
                title="Skip (Dev Mode)"
                onPress={handleSkip}
                variant="ghost"
                style={styles.skipButton}
              />
            )}
          </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  formCard: {
    padding: 24,
  },
  formTitle: {
    marginBottom: 8,
  },
  formDescription: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    marginBottom: 20,
  },
  submitButton: {
    marginTop: 8,
  },
  skipButton: {
    marginTop: 16,
  },
});

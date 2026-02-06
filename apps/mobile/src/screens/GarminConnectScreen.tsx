import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../config/api';
import { useAuthStore } from '../store/useAuthStore';
import { useWearableStore } from '../store/useWearableStore';

export const GarminConnectScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { connectGarmin } = useWearableStore();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const handleConnect = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      Alert.alert('Required', 'Please enter your Garmin API credentials');
      return;
    }

    setConnecting(true);
    try {
      // Register device with backend
      const deviceData = {
        type: 'garmin',
        name: 'Garmin Device',
        identifier: `garmin_${user?.id}_${Date.now()}`,
        metadata: {
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
          platform: 'garmin',
        },
      };

      await api.post('/api/v1/devices', deviceData);
      
      // Connect in store
      await connectGarmin(apiKey.trim(), apiSecret.trim());
      
      setConnected(true);
      Alert.alert('Connected', 'Your Garmin device is now connected.');
      
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      console.error('Failed to connect Garmin:', error);
      Alert.alert('Connection Failed', error.message || 'Failed to connect Garmin device.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text variant="h2">Connect Garmin</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.infoCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="watch-outline" size={64} color={colors.accent} />
          </View>
          <Text variant="h3" style={styles.title}>
            Connect Your Garmin
          </Text>
          <Text variant="body" color="secondary" style={styles.description}>
            Sync activity data from your Garmin device to enhance hike tracking
          </Text>
        </Card>

        <Card style={styles.formCard}>
          <Text variant="body" style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Enter Garmin API key"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            secureTextEntry
          />
          
          <Text variant="body" style={[styles.label, styles.labelMargin]}>API Secret</Text>
          <TextInput
            style={styles.input}
            value={apiSecret}
            onChangeText={setApiSecret}
            placeholder="Enter Garmin API secret"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            secureTextEntry
          />

          <Text variant="caption" color="tertiary" style={styles.helpText}>
            Get your API credentials from Garmin Developer Portal
          </Text>
        </Card>

        <View style={styles.footer}>
          <Button
            title={connected ? 'Connected' : connecting ? 'Connecting...' : 'Connect Garmin'}
            onPress={handleConnect}
            disabled={connecting || connected}
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    margin: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
  },
  formCard: {
    margin: 20,
    marginTop: 0,
  },
  label: {
    marginBottom: 8,
    fontFamily: 'Inter_500Medium',
  },
  labelMargin: {
    marginTop: 16,
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
  },
  helpText: {
    marginTop: 12,
  },
  footer: {
    padding: 20,
    paddingTop: 0,
  },
});

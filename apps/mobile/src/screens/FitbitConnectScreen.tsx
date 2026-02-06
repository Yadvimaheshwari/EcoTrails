import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../config/api';
import { useAuthStore } from '../store/useAuthStore';
import { useWearableStore } from '../store/useWearableStore';

export const FitbitConnectScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { connectFitbit } = useWearableStore();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // OAuth flow - redirect to Fitbit authorization
      const authUrl = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${process.env.FITBIT_CLIENT_ID}&redirect_uri=${encodeURIComponent('ecotrails://fitbit-callback')}&scope=activity heartrate sleep&expires_in=31536000`;
      
      const supported = await Linking.canOpenURL(authUrl);
      if (supported) {
        await Linking.openURL(authUrl);
        // In real implementation, handle OAuth callback
        // For now, simulate connection
        setTimeout(async () => {
          const deviceData = {
            type: 'fitbit',
            name: 'Fitbit Device',
            identifier: `fitbit_${user?.id}_${Date.now()}`,
            metadata: {
              platform: 'fitbit',
              oauthConnected: true,
            },
          };

          await api.post('/api/v1/devices', deviceData);
          await connectFitbit('mock_access_token');
          
          setConnected(true);
          Alert.alert('Connected', 'Your Fitbit is now connected.');
          
          setTimeout(() => {
            navigation.goBack();
          }, 1500);
        }, 2000);
      } else {
        Alert.alert('Error', 'Unable to open Fitbit authorization');
        setConnecting(false);
      }
    } catch (error: any) {
      console.error('Failed to connect Fitbit:', error);
      Alert.alert('Connection Failed', error.message || 'Failed to connect Fitbit.');
      setConnecting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text variant="h2">Connect Fitbit</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.infoCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="watch-outline" size={64} color={colors.accent} />
          </View>
          <Text variant="h3" style={styles.title}>
            Connect Your Fitbit
          </Text>
          <Text variant="body" color="secondary" style={styles.description}>
            Authorize EcoTrails to access your Fitbit data
          </Text>
        </Card>

        <Card style={styles.permissionCard}>
          <Text variant="body" color="secondary">
            EcoTrails will access:
          </Text>
          <View style={styles.permissionList}>
            <Text variant="caption" color="secondary">• Activity data</Text>
            <Text variant="caption" color="secondary">• Heart rate</Text>
            <Text variant="caption" color="secondary">• Sleep data (for context)</Text>
          </View>
        </Card>

        <View style={styles.footer}>
          <Button
            title={connected ? 'Connected' : connecting ? 'Connecting...' : 'Authorize Fitbit'}
            onPress={handleConnect}
            disabled={connecting || connected}
            size="lg"
          />
          <Text variant="caption" color="tertiary" style={styles.disclaimer}>
            You'll be redirected to Fitbit to authorize the connection
          </Text>
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
  permissionCard: {
    margin: 20,
    marginTop: 0,
  },
  permissionList: {
    marginTop: 12,
    gap: 8,
  },
  footer: {
    padding: 20,
    paddingTop: 0,
  },
  disclaimer: {
    marginTop: 16,
    textAlign: 'center',
  },
});

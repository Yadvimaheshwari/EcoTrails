import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../config/api';
import { useAuthStore } from '../store/useAuthStore';
import { useWearableStore } from '../store/useWearableStore';

export const AppleWatchConnectScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { connectAppleWatch } = useWearableStore();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Request HealthKit permissions
      const hasPermission = await requestHealthKitPermission();
      
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'HealthKit access is needed to sync heart rate, cadence, and activity data from your Apple Watch.',
          [{ text: 'OK' }]
        );
        setConnecting(false);
        return;
      }

      // Register device with backend
      const deviceData = {
        type: 'apple_watch',
        name: 'Apple Watch',
        identifier: `apple_watch_${user?.id}_${Date.now()}`,
        metadata: {
          platform: 'ios',
          healthKitEnabled: true,
        },
      };

      await api.post('/api/v1/devices', deviceData);
      
      // Connect in store
      await connectAppleWatch();
      
      setConnected(true);
      Alert.alert('Connected', 'Your Apple Watch is now connected and will enhance your hike tracking.');
      
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      console.error('Failed to connect Apple Watch:', error);
      Alert.alert('Connection Failed', error.message || 'Failed to connect Apple Watch. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const requestHealthKitPermission = async (): Promise<boolean> => {
    // In a real implementation, this would use HealthKit APIs
    // For now, return true as a stub
    return true;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text variant="h2">Connect Apple Watch</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.infoCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="watch" size={64} color={colors.primary} />
          </View>
          <Text variant="h3" style={styles.title}>
            Enhance Your Hikes
          </Text>
          <Text variant="body" color="secondary" style={styles.description}>
            Connect your Apple Watch to unlock:
          </Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text variant="body" style={styles.benefitText}>
                Real-time heart rate monitoring
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text variant="body" style={styles.benefitText}>
                Cadence and effort metrics
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text variant="body" style={styles.benefitText}>
                Mastery progression tracking
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text variant="body" style={styles.benefitText}>
                Emotional inference from HRV
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.permissionCard}>
          <Text variant="body" color="secondary">
            EcoTrails will request access to:
          </Text>
          <View style={styles.permissionList}>
            <Text variant="caption" color="secondary">• Heart Rate</Text>
            <Text variant="caption" color="secondary">• Active Energy</Text>
            <Text variant="caption" color="secondary">• Workout Data</Text>
          </View>
        </Card>

        <View style={styles.footer}>
          <Button
            title={connected ? 'Connected' : connecting ? 'Connecting...' : 'Connect Apple Watch'}
            onPress={handleConnect}
            disabled={connecting || connected}
            size="lg"
          />
          <Text variant="caption" color="tertiary" style={styles.disclaimer}>
            Your data stays private and is only used to enhance your hike experience
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
    marginBottom: 24,
    textAlign: 'center',
  },
  benefitsList: {
    width: '100%',
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    flex: 1,
  },
  permissionCard: {
    margin: 20,
    marginTop: 0,
    marginBottom: 16,
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

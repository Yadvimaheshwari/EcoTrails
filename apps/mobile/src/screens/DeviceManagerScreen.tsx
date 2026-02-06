import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../config/api';
import { useAuthStore } from '../store/useAuthStore';

interface Device {
  id: string;
  type: string;
  name: string;
  identifier: string;
  metadata?: any;
  lastSeenAt?: string;
}

export const DeviceManagerScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await api.get('/api/v1/devices');
      setDevices(response.data.devices || []);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (type: string) => {
    if (type === 'apple_watch') {
      navigation.navigate('AppleWatchConnect');
    } else if (type === 'garmin') {
      navigation.navigate('GarminConnect');
    } else if (type === 'fitbit') {
      navigation.navigate('FitbitConnect');
    }
  };

  const handleRemove = async (deviceId: string) => {
    try {
      await api.delete(`/api/v1/devices/${deviceId}`);
      await loadDevices();
    } catch (error) {
      console.error('Failed to remove device:', error);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'apple_watch':
        return 'watch';
      case 'garmin':
        return 'watch-outline';
      case 'fitbit':
        return 'watch-outline';
      case 'ecodroid':
        return 'hardware-chip';
      default:
        return 'phone-portrait';
    }
  };

  const getDeviceName = (type: string) => {
    switch (type) {
      case 'apple_watch':
        return 'Apple Watch';
      case 'garmin':
        return 'Garmin';
      case 'fitbit':
        return 'Fitbit';
      case 'ecodroid':
        return 'EcoDroid';
      default:
        return 'Device';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text variant="h2">Devices</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text variant="body" color="secondary" style={styles.sectionDescription}>
            Connect devices to enhance tracking accuracy and unlock mastery insights
          </Text>
        </View>

        <Card style={styles.deviceCard}>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceIconContainer}>
              <Ionicons name="watch" size={32} color={colors.primary} />
            </View>
            <View style={styles.deviceInfo}>
              <Text variant="h3">Apple Watch</Text>
              <Text variant="caption" color="secondary">
                Heart rate, cadence, effort metrics
              </Text>
            </View>
          </View>
          <Button
            title={devices.some(d => d.type === 'apple_watch') ? 'Connected' : 'Connect'}
            onPress={() => handleConnect('apple_watch')}
            variant={devices.some(d => d.type === 'apple_watch') ? 'outline' : 'primary'}
            disabled={devices.some(d => d.type === 'apple_watch')}
            style={styles.connectButton}
          />
        </Card>

        <Card style={styles.deviceCard}>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceIconContainer}>
              <Ionicons name="watch-outline" size={32} color={colors.accent} />
            </View>
            <View style={styles.deviceInfo}>
              <Text variant="h3">Garmin</Text>
              <Text variant="caption" color="secondary">
                Activity tracking, heart rate, GPS
              </Text>
            </View>
          </View>
          <Button
            title={devices.some(d => d.type === 'garmin') ? 'Connected' : 'Connect'}
            onPress={() => handleConnect('garmin')}
            variant={devices.some(d => d.type === 'garmin') ? 'outline' : 'primary'}
            disabled={devices.some(d => d.type === 'garmin')}
            style={styles.connectButton}
          />
        </Card>

        <Card style={styles.deviceCard}>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceIconContainer}>
              <Ionicons name="watch-outline" size={32} color={colors.accent} />
            </View>
            <View style={styles.deviceInfo}>
              <Text variant="h3">Fitbit</Text>
              <Text variant="caption" color="secondary">
                Heart rate, steps, activity zones
              </Text>
            </View>
          </View>
          <Button
            title={devices.some(d => d.type === 'fitbit') ? 'Connected' : 'Connect'}
            onPress={() => handleConnect('fitbit')}
            variant={devices.some(d => d.type === 'fitbit') ? 'outline' : 'primary'}
            disabled={devices.some(d => d.type === 'fitbit')}
            style={styles.connectButton}
          />
        </Card>

        {devices.length > 0 && (
          <View style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>Connected Devices</Text>
            {devices.map((device) => (
              <Card key={device.id} style={styles.connectedDevice}>
                <View style={styles.deviceRow}>
                  <Ionicons
                    name={getDeviceIcon(device.type) as any}
                    size={24}
                    color={colors.primary}
                  />
                  <View style={styles.deviceDetails}>
                    <Text variant="body">{device.name || getDeviceName(device.type)}</Text>
                    <Text variant="caption" color="secondary">
                      {device.type} • Last seen {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleDateString() : 'Never'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemove(device.id)}>
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
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
  section: {
    padding: 20,
    paddingBottom: 0,
  },
  sectionDescription: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  deviceCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  connectButton: {
    marginTop: 8,
  },
  connectedDevice: {
    marginBottom: 12,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceDetails: {
    flex: 1,
    marginLeft: 12,
  },
});

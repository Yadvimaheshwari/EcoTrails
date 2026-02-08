import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useHikeStore } from '../store/useHikeStore';
import { useWearableStore } from '../store/useWearableStore';
import { api } from '../config/api';

export const TrackingSetupScreen: React.FC = ({ navigation }: any) => {
  const [phoneSensors, setPhoneSensors] = useState(true);
  const { currentHike } = useHikeStore();
  const { getConnectedDevices } = useWearableStore();
  const [connectedDevices, setConnectedDevices] = useState<string[]>([]);
  const [ecodroidConnected, setEcodroidConnected] = useState(false);
  const enableLegacyScreens = process.env.EXPO_PUBLIC_ENABLE_LEGACY_SCREENS === '1';

  useEffect(() => {
    loadConnectedDevices();
  }, []);

  const loadConnectedDevices = async () => {
    try {
      const response = await api.get('/api/v1/devices');
      const devices = response.data.devices || [];
      const wearableTypes = devices
        .filter((d: any) => ['apple_watch', 'garmin', 'fitbit'].includes(d.type))
        .map((d: any) => d.type);
      setConnectedDevices(wearableTypes);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const wearableConnected = connectedDevices.length > 0;

  const handleConnectWearable = () => {
    if (!enableLegacyScreens) return;
    navigation.navigate('DeviceManager');
  };

  const handleConnectEcoDroid = () => {
    // Placeholder for EcoDroid connection
    if (!enableLegacyScreens) return;
    navigation.navigate('EcoDroidConnect');
  };

  const handleStart = () => {
    navigation.navigate('DuringHike', {
      trailId: currentHike.trailId,
      trailName: currentHike.name,
      placeId: currentHike.placeId,
      trailLat: currentHike.trailLocation?.lat,
      trailLng: currentHike.trailLocation?.lng,
      trailBounds: currentHike.trailBounds,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text variant="h2">Tracking Setup</Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Choose how to capture your hike
          </Text>
        </View>

        <Card style={styles.optionCard}>
          <View style={styles.optionHeader}>
            <View style={styles.optionIconContainer}>
              <Ionicons name="phone-portrait-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text variant="h3">Phone Sensors</Text>
              <Text variant="caption" color="secondary">GPS, motion, camera</Text>
            </View>
            <Switch
              value={phoneSensors}
              onValueChange={setPhoneSensors}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={colors.surface}
            />
          </View>
        </Card>

        <Card style={[styles.optionCard, styles.recommendedCard]}>
          <View style={styles.recommendedBadge}>
            <Text variant="caption" style={styles.recommendedText}>Recommended</Text>
          </View>
          <TouchableOpacity
            style={styles.optionHeader}
            onPress={handleConnectWearable}
            disabled={wearableConnected}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons
                name={wearableConnected ? "watch" : "watch-outline"}
                size={24}
                color={colors.accent}
              />
            </View>
            <View style={styles.optionContent}>
              <Text variant="h3">Wearable Device</Text>
              <Text variant="caption" color="secondary">
                {wearableConnected ? 'Connected' : 'Apple Watch, Garmin, Fitbit'}
              </Text>
            </View>
            {wearableConnected ? (
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            )}
          </TouchableOpacity>
        </Card>

        <Card style={styles.optionCard}>
          <TouchableOpacity
            style={styles.optionHeader}
            onPress={handleConnectEcoDroid}
            disabled={ecodroidConnected}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons
                name={ecodroidConnected ? "hardware-chip" : "hardware-chip-outline"}
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.optionContent}>
              <Text variant="h3">EcoDroid</Text>
              <Text variant="caption" color="secondary">
                {ecodroidConnected ? 'Connected' : 'Optional environmental sensors'}
              </Text>
            </View>
            {ecodroidConnected ? (
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            )}
          </TouchableOpacity>
        </Card>

        <View style={styles.footer}>
          <Button
            title="Start Tracking"
            onPress={handleStart}
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
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 8,
  },
  subtitle: {
    marginTop: 8,
  },
  optionCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  recommendedCard: {
    borderColor: colors.accent,
    borderWidth: 1.5,
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendedText: {
    color: colors.surface,
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  footer: {
    padding: 20,
    paddingTop: 8,
  },
});

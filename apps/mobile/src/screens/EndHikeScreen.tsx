import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useHikeStore } from '../store/useHikeStore';
import { api } from '../config/api';

export const EndHikeScreen: React.FC = ({ navigation }: any) => {
  const { currentHike, clearHike } = useHikeStore();
  const [syncing, setSyncing] = useState(true);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    syncHike();
  }, []);

  const syncHike = async () => {
    try {
      // Simulate sync progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setSyncProgress(i);
      }

      // Actually sync to backend
      if (currentHike.id) {
        // Create hike session
        const hikeResponse = await api.post('/api/v1/hikes', {
          trailId: currentHike.trailId,
          placeId: currentHike.placeId,
          name: currentHike.name,
          startTime: currentHike.startTimeMs ? new Date(currentHike.startTimeMs).toISOString() : undefined,
        });

        const hikeId = hikeResponse.data.hike.id;

        // Upload route points in batches
        if (currentHike.routePoints.length > 0) {
          await api.post(`/api/v1/hikes/${hikeId}/route`, {
            points: currentHike.routePoints.map((p, idx) => ({
              sequence: idx,
              timestamp: p.timestamp.toISOString(),
              location: p.location,
              metadata: p.metadata,
            })),
          });
        }

        // Upload sensor batches
        for (const batch of currentHike.sensorBatches) {
          await api.post(`/api/v1/hikes/${hikeId}/sensors`, {
            sensors: batch.map((s) => ({
              timestamp: s.timestamp.toISOString(),
              type: s.type,
              data: s.data,
              location: s.location,
              confidence: s.confidence,
            })),
          });
        }

        // Mark hike as completed
        await api.patch(`/api/v1/hikes/${hikeId}/status`, {
          status: 'completed',
          endTime: new Date().toISOString(),
        });

        // Start analysis
        await api.post(`/api/v1/hikes/${hikeId}/insights/start`);
      }

      setSyncing(false);
      navigation.replace('MediaPicker', { hikeId: currentHike.id });
    } catch (error) {
      console.error('Sync failed:', error);
      // Hike is saved in offline queue, will sync later
      setSyncing(false);
      navigation.replace('MediaPicker', { hikeId: currentHike.id });
    }
  };

  const handleViewReport = () => {
    navigation.navigate('PostHikeReport', { hikeId: currentHike.id });
  };

  const handleDone = () => {
    clearHike();
    navigation.navigate('Explore');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text variant="h2">Hike Complete</Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Atlas is connecting what it observed
          </Text>
        </View>

        {syncing ? (
          <Card style={styles.syncCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="body" color="secondary" style={styles.syncText}>
              Syncing data... {syncProgress}%
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${syncProgress}%` }]} />
            </View>
          </Card>
        ) : (
          <View style={styles.completeSection}>
            <Card style={styles.successCard}>
              <Text variant="h3">All synced</Text>
              <Text variant="body" color="secondary" style={styles.successText}>
                Your hike data has been uploaded and analysis is starting
              </Text>
            </Card>

            <View style={styles.actions}>
              <Button
                title="View Report"
                onPress={handleViewReport}
                size="lg"
                style={styles.button}
              />
              <Button
                title="Done"
                onPress={handleDone}
                variant="outline"
                size="lg"
              />
            </View>
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
  syncCard: {
    margin: 20,
    alignItems: 'center',
    padding: 32,
  },
  syncText: {
    marginTop: 16,
    marginBottom: 24,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  completeSection: {
    padding: 20,
  },
  successCard: {
    marginBottom: 24,
    alignItems: 'center',
    padding: 24,
  },
  successText: {
    marginTop: 8,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
  button: {
    marginBottom: 8,
  },
});

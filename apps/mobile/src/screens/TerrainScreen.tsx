import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';

export const TerrainScreen: React.FC = () => {
  const [timeSlider, setTimeSlider] = useState(0.5);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h2">Terrain</Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          3D trail visualization
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 37.7749,
              longitude: -122.4194,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            mapType="terrain"
          />
        </View>

        <Card style={styles.controlsCard}>
          <Text variant="h3" style={styles.controlTitle}>Time Slider</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={timeSlider}
            onValueChange={setTimeSlider}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
          <Text variant="caption" color="secondary" style={styles.sliderLabel}>
            {Math.round(timeSlider * 100)}% of hike
          </Text>
        </Card>

        <Card style={styles.insightsCard}>
          <Text variant="h3" style={styles.insightsTitle}>Insight Pins</Text>
          <Text variant="body" color="secondary">
            Tap markers on the map to see observations and discoveries from your hike
          </Text>
        </Card>
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
    padding: 20,
    paddingBottom: 8,
  },
  subtitle: {
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 400,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    flex: 1,
  },
  controlsCard: {
    margin: 20,
    marginTop: 24,
  },
  controlTitle: {
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabel: {
    marginTop: 8,
    textAlign: 'center',
  },
  insightsCard: {
    margin: 20,
    marginTop: 0,
  },
  insightsTitle: {
    marginBottom: 8,
  },
});

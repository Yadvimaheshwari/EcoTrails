import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../config/api';
import { useHikeStore } from '../store/useHikeStore';

export const TrailDetailScreen: React.FC = ({ route, navigation }: any) => {
  const { trailId, placeId } = route.params || {};
  const [trail, setTrail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { startHike } = useHikeStore();

  useEffect(() => {
    if (trailId || placeId) {
      loadTrail();
    } else {
      setLoading(false);
    }
  }, [trailId, placeId]);

  const loadTrail = async () => {
    if (!trailId) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.get(`/api/v1/trails/${trailId}`);
      setTrail(response.data.trail);
    } catch (error: any) {
      console.error('Failed to load trail:', error);
      // If trail not found, try to load place and show trails
      if (placeId) {
        try {
          const placeResponse = await api.get(`/api/v1/places/${placeId}`);
          if (placeResponse.data.trails && placeResponse.data.trails.length > 0) {
            setTrail(placeResponse.data.trails[0]);
          }
        } catch (err) {
          console.error('Failed to load place trails:', err);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartHike = async () => {
    if (!placeId) {
      console.error('Missing placeId');
      return;
    }
    const loc = (trail?.meta_data?.trailLocation || trail?.meta_data?.location || trail?.location || {}) as any;
    const trailLocation =
      typeof trail?.lat === 'number' && typeof trail?.lng === 'number'
        ? { lat: trail.lat, lng: trail.lng }
        : typeof loc?.lat === 'number' && typeof loc?.lng === 'number'
          ? { lat: loc.lat, lng: loc.lng }
          : null;

    const bounds =
      (trail?.meta_data || trail?.metadata || {})?.bounding_box ||
      (trail?.meta_data || trail?.metadata || {})?.bounds ||
      null;

    await startHike(trailId || null, placeId, trail?.name, trailLocation, bounds);
    navigation.navigate('TrackingSetup');
  };

  if (loading || !trail) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  const location =
    typeof trail?.lat === 'number' && typeof trail?.lng === 'number'
      ? { lat: trail.lat, lng: trail.lng }
      : trail?.meta_data?.location || trail?.location || trail?.place?.location || null;
  const hasLocation = typeof (location as any)?.lat === 'number' && typeof (location as any)?.lng === 'number';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.mapContainer}>
          {hasLocation ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: (location as any).lat,
                longitude: (location as any).lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              {Array.isArray(trail?.route_geometry) && trail.route_geometry.length > 1 ? (
                <Polyline
                  coordinates={trail.route_geometry.map((p: any) => ({ latitude: p.lat, longitude: p.lng }))}
                  strokeColor={colors.primary}
                  strokeWidth={3}
                />
              ) : null}
            </MapView>
          ) : (
            <View style={[styles.map, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text variant="body" color="secondary">
                Unable to load trail location. Please try again.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.details}>
          <Text variant="h2" style={styles.title}>{trail.name}</Text>
          <Text variant="body" color="secondary" style={styles.description}>
            {trail.description}
          </Text>

          <View style={styles.stats}>
            <Card style={styles.statCard}>
              <Text variant="caption" color="secondary">Distance</Text>
              <Text variant="h3">{trail.lengthMiles} mi</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text variant="caption" color="secondary">Difficulty</Text>
              <Text variant="h3">{trail.difficulty}</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text variant="caption" color="secondary">Rating</Text>
              <Text variant="h3">{trail.rating?.toFixed(1) || 'N/A'}</Text>
            </Card>
          </View>

          <Button
            title="Start Hike"
            onPress={handleStartHike}
            size="lg"
            style={styles.startButton}
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
    paddingBottom: 0,
  },
  mapContainer: {
    height: 300,
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
  details: {
    padding: 20,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 24,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  startButton: {
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

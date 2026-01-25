/**
 * Hike Summary Screen
 * Shows summary after ending a hike
 * NEVER BLANK - always shows fallback UI if data fails to load
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import ApiService from '../services/ApiService';

interface RoutePoint {
  latitude: number;
  longitude: number;
}

const HikeSummaryScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params || {}) as {
    sessionId?: string;
    distance_miles?: number;
    duration_minutes?: number;
    route_path?: RoutePoint[];
    apiSuccess?: boolean;
    apiError?: string;
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Defensive: Use params or fallback values - NEVER allow undefined/null to cause blank screen
  const distance_miles = params.distance_miles ?? 0;
  const duration_minutes = params.duration_minutes ?? 0;
  const route_path = params.route_path ?? [];
  const sessionId = params.sessionId ?? 'unknown';
  const apiSuccess = params.apiSuccess ?? false;
  const apiError = params.apiError ?? null;

  // Calculate stats
  const hours = Math.floor(duration_minutes / 60);
  const minutes = duration_minutes % 60;
  const avgPace = distance_miles > 0 ? (duration_minutes / distance_miles).toFixed(1) : '0.0';

  // Calculate map region from route
  const mapRegion = React.useMemo(() => {
    if (route_path.length === 0) {
      return {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    const lats = route_path.map(p => p.latitude);
    const lngs = route_path.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5 || 0.05,
      longitudeDelta: (maxLng - minLng) * 1.5 || 0.05,
    };
  }, [route_path]);

  const formatDuration = () => {
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleSave = () => {
    navigation.navigate('Activity' as never, { screen: 'ActivityList' } as never);
  };

  const handleShare = () => {
    // Share functionality placeholder - UI exists but functionality can be added later
    console.log('Share hike');
  };

  // Defensive: Always render something - never blank screen
  // This component will ALWAYS render content, even if all data is missing
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header - Always visible */}
      <View style={styles.header}>
        <Text style={styles.title}>Hike Complete! 🎉</Text>
        <Text style={styles.subtitle}>Great job on your adventure</Text>
        
        {/* Show API error if present, but don't block UI */}
        {apiError && !apiSuccess && (
          <View style={styles.apiErrorBanner}>
            <Text style={styles.apiErrorText}>
              ⚠️ Hike data saved locally. Could not sync to server: {apiError}
            </Text>
          </View>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{distance_miles.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Miles</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatDuration()}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{avgPace}</Text>
          <Text style={styles.statLabel}>Min/Mile</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>--</Text>
          <Text style={styles.statLabel}>Calories</Text>
        </View>
      </View>

      {/* Route Map - Always render, with fallback */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Route</Text>
        <View style={styles.mapContainer}>
          {route_path.length > 0 ? (
            <MapView
              style={styles.map}
              initialRegion={mapRegion}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Polyline
                coordinates={route_path}
                strokeColor="#2D4739"
                strokeWidth={4}
              />
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>🗺️</Text>
              <Text style={styles.mapPlaceholderSubtext}>Route data unavailable</Text>
              <Text style={styles.mapPlaceholderSubtext}>
                GPS tracking may not have been available
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Photos Section Placeholder */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos</Text>
        <View style={styles.photosPlaceholder}>
          <Text style={styles.photosText}>📸</Text>
          <Text style={styles.photosSubtext}>No photos captured</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Hike</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Back to Activity */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Activity' as never, { screen: 'ActivityList' } as never)}
      >
        <Text style={styles.backButtonText}>View All Hikes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F7',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8DE',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D4739',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8B82',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8DE',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D4739',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8B82',
  },
  section: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8DE',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D4739',
    marginBottom: 12,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F7',
  },
  mapPlaceholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#8E8B82',
  },
  photosPlaceholder: {
    padding: 40,
    backgroundColor: '#F9F9F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8DE',
    alignItems: 'center',
  },
  photosText: {
    fontSize: 48,
    marginBottom: 8,
  },
  photosSubtext: {
    fontSize: 14,
    color: '#8E8B82',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2D4739',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8DE',
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#2D4739',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8DE',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#2D4739',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HikeSummaryScreen;

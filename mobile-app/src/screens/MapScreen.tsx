/**
 * Map Screen
 * Interactive map view for exploring trails and parks
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import ApiService, { Park, Trail, ParkDetail } from '../services/ApiService';
import MapBottomSheet from '../components/MapBottomSheet';

const MapScreen: React.FC = () => {
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);
  
  const [parks, setParks] = useState<Park[]>([]);
  const [selectedPark, setSelectedPark] = useState<ParkDetail | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'checking'>('checking');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showParkSheet, setShowParkSheet] = useState(false);
  const [showTrailSheet, setShowTrailSheet] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 10,
    longitudeDelta: 10,
  });

  useEffect(() => {
    loadParks();
    requestLocationPermission();
  }, []);

  const loadParks = async () => {
    try {
      setLoading(true);
      setError(null);
      const parksData = await ApiService.getParks();
      setParks(parksData);
      
      // Center map on first park or default location
      if (parksData.length > 0) {
        const firstPark = parksData[0];
        setMapRegion({
          latitude: firstPark.coordinates.lat,
          longitude: firstPark.coordinates.lng,
          latitudeDelta: 5,
          longitudeDelta: 5,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load parks');
      console.error('Error loading parks:', err);
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      setLocationPermission('checking');
      
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setLocationPermission('granted');
          getCurrentLocation();
        } else {
          setLocationPermission('denied');
        }
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationPermission('granted');
          getCurrentLocation();
        } else {
          setLocationPermission('denied');
        }
      }
    } catch (err) {
      console.error('Error requesting location permission:', err);
      setLocationPermission('denied');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setUserLocation(coords);
      
      // Center map on user location
      setMapRegion({
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 2,
        longitudeDelta: 2,
      });
      
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 2,
          longitudeDelta: 2,
        });
      }
    } catch (err) {
      console.error('Error getting location:', err);
    }
  };

  const handleParkMarkerPress = async (park: Park) => {
    try {
      const parkDetail = await ApiService.getParkDetail(park.id);
      setSelectedPark(parkDetail);
      setShowParkSheet(true);
      
      // Center map on park
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: park.coordinates.lat,
          longitude: park.coordinates.lng,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load park details');
    }
  };

  const handleViewPark = () => {
    if (selectedPark) {
      setShowParkSheet(false);
      navigation.navigate('Explore' as never, {
        screen: 'ParkDetail',
        params: { parkId: selectedPark.id },
      } as never);
    }
  };

  const handleTrailPress = async (trail: Trail) => {
    setSelectedTrail(trail);
    setShowTrailSheet(true);
  };

  const handleViewTrail = () => {
    if (selectedTrail) {
      setShowTrailSheet(false);
      navigation.navigate('Explore' as never, {
        screen: 'TrailDetail',
        params: { trailId: selectedTrail.id },
      } as never);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Map</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D4739" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Map</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to load map</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadParks}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Map</Text>
        <Text style={styles.subtitle}>Explore trails and parks</Text>
        {locationPermission === 'denied' && (
          <TouchableOpacity
            style={styles.enableLocationButton}
            onPress={requestLocationPermission}
          >
            <Text style={styles.enableLocationText}>Enable Location</Text>
          </TouchableOpacity>
        )}
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation={locationPermission === 'granted'}
        showsMyLocationButton={locationPermission === 'granted'}
      >
        {/* Park Markers */}
        {parks.map((park) => (
          <Marker
            key={park.id}
            coordinate={{
              latitude: park.coordinates.lat,
              longitude: park.coordinates.lng,
            }}
            title={park.name}
            description={park.type}
            onPress={() => handleParkMarkerPress(park)}
          />
        ))}

        {/* Selected Park Boundary */}
        {selectedPark?.boundary && (
          <Polygon
            coordinates={selectedPark.boundary}
            fillColor="rgba(45, 71, 57, 0.2)"
            strokeColor="#2D4739"
            strokeWidth={2}
          />
        )}

        {/* Trail Polylines */}
        {selectedPark?.trails?.map((trail) => {
          // Generate simple polyline from waypoints or start/end
          const coordinates = trail.waypoints && trail.waypoints.length > 0
            ? trail.waypoints.map(wp => ({ latitude: wp.lat, longitude: wp.lng }))
            : trail.trailhead_location
            ? [
                { latitude: trail.trailhead_location.lat, longitude: trail.trailhead_location.lng },
                { latitude: trail.coordinates.lat, longitude: trail.coordinates.lng },
              ]
            : [];

          if (coordinates.length === 0) return null;

          return (
            <Polyline
              key={trail.id}
              coordinates={coordinates}
              strokeColor="#2D4739"
              strokeWidth={3}
              onPress={() => handleTrailPress(trail)}
            />
          );
        })}
      </MapView>

      {/* Park Bottom Sheet */}
      <MapBottomSheet
        visible={showParkSheet}
        onClose={() => setShowParkSheet(false)}
        title={selectedPark?.name || ''}
        subtitle={selectedPark?.type}
        details={selectedPark ? [
          { label: 'Location', value: selectedPark.state },
          { label: 'Trails', value: `${selectedPark.trails?.length || 0} available` },
        ] : undefined}
        onViewDetail={handleViewPark}
        viewDetailLabel="View Park"
      />

      {/* Trail Bottom Sheet */}
      <MapBottomSheet
        visible={showTrailSheet}
        onClose={() => setShowTrailSheet(false)}
        title={selectedTrail?.name || ''}
        subtitle={`${selectedTrail?.difficulty.toUpperCase()} • ${selectedTrail?.length_miles.toFixed(1)} mi`}
        details={selectedTrail ? [
          { label: 'Distance', value: `${selectedTrail.length_miles.toFixed(1)} mi` },
          { label: 'Elevation Gain', value: `${selectedTrail.elevation_gain_ft} ft` },
          { label: 'Duration', value: `~${selectedTrail.estimated_duration_hours.toFixed(1)} hrs` },
        ] : undefined}
        onViewDetail={handleViewTrail}
        viewDetailLabel="View Trail"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F7',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8DE',
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
  enableLocationButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E2E8DE',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  enableLocationText: {
    fontSize: 14,
    color: '#2D4739',
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8B82',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2D4739',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#8E8B82',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2D4739',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MapScreen;

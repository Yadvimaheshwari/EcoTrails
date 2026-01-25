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
      // Defensive check: ensure park has required fields
      if (!park || !park.id) {
        Alert.alert('Error', 'Invalid park information');
        return;
      }

      const parkDetail = await ApiService.getParkDetail(park.id);
      
      // Defensive check: ensure park detail loaded successfully
      if (!parkDetail || !parkDetail.id) {
        Alert.alert('Error', 'Failed to load park details');
        return;
      }

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
      console.error('Error loading park detail:', err);
      Alert.alert('Error', err.message || 'Failed to load park details');
    }
  };

  const handleViewPark = () => {
    // Defensive check: ensure selectedPark and parkId exist
    if (!selectedPark || !selectedPark.id) {
      Alert.alert('Error', 'Park information not available');
      return;
    }

    setShowParkSheet(false);
    // Navigate to ParkDetail - NO AUTO-START
    navigation.navigate('Explore' as never, {
      screen: 'ParkDetail',
      params: { parkId: selectedPark.id },
    } as never);
  };

  const handleTrailPress = async (trail: Trail) => {
    // Defensive check: ensure trail has required fields
    if (!trail || !trail.id) {
      Alert.alert('Error', 'Invalid trail information');
      return;
    }

    setSelectedTrail(trail);
    setShowTrailSheet(true);
    
    // Center map on trail
    if (mapRef.current && trail.coordinates) {
      mapRef.current.animateToRegion({
        latitude: trail.coordinates.lat,
        longitude: trail.coordinates.lng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    }
  };

  const handleViewTrail = () => {
    // Defensive check: ensure selectedTrail and trailId exist
    if (!selectedTrail || !selectedTrail.id) {
      Alert.alert('Error', 'Trail information not available');
      return;
    }

    setShowTrailSheet(false);
    // Navigate to TrailDetail - NO AUTO-START (hike can only start from TrailDetail screen)
    navigation.navigate('Explore' as never, {
      screen: 'TrailDetail',
      params: { trailId: selectedTrail.id },
    } as never);
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
          <View style={styles.locationPermissionBanner}>
            <Text style={styles.locationPermissionText}>
              📍 Location disabled - Map still works for exploring parks and trails
            </Text>
            <TouchableOpacity
              style={styles.enableLocationButton}
              onPress={requestLocationPermission}
            >
              <Text style={styles.enableLocationText}>Enable Location</Text>
            </TouchableOpacity>
          </View>
        )}
        {parks.length === 0 && !loading && (
          <View style={styles.emptyStateBanner}>
            <Text style={styles.emptyStateText}>
              No parks found. Try adjusting your search or filters.
            </Text>
          </View>
        )}
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={mapRegion}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation={locationPermission === 'granted'}
        showsMyLocationButton={locationPermission === 'granted'}
        // Map always renders, even without location permission
        loadingEnabled={true}
        mapType="standard"
      >
        {/* Park Markers - Always visible, even without location permission */}
        {parks.map((park) => {
          // Defensive check: ensure park has coordinates
          if (!park || !park.coordinates || !park.id) {
            return null;
          }

          return (
            <Marker
              key={park.id}
              coordinate={{
                latitude: park.coordinates.lat,
                longitude: park.coordinates.lng,
              }}
              title={park.name}
              description={park.type || 'Park'}
              pinColor="#2D4739"
              onPress={() => handleParkMarkerPress(park)}
            />
          );
        })}

        {/* Selected Park Boundary Polygon */}
        {selectedPark?.boundary && selectedPark.boundary.length > 0 && (
          <Polygon
            coordinates={selectedPark.boundary}
            fillColor="rgba(45, 71, 57, 0.15)"
            strokeColor="#2D4739"
            strokeWidth={2}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Trail Polylines for selected park */}
        {selectedPark?.trails && selectedPark.trails.length > 0 && selectedPark.trails.map((trail) => {
          // Defensive check: ensure trail has coordinates
          if (!trail || !trail.coordinates) {
            return null;
          }

          // Generate polyline from waypoints, trailhead/end, or fallback to simple line
          let coordinates: Array<{ latitude: number; longitude: number }> = [];
          
          if (trail.waypoints && trail.waypoints.length > 0) {
            // Use waypoints if available
            coordinates = trail.waypoints.map(wp => ({ 
              latitude: wp.lat, 
              longitude: wp.lng 
            }));
          } else if (trail.trailhead_location) {
            // Use trailhead to end point
            coordinates = [
              { 
                latitude: trail.trailhead_location.lat, 
                longitude: trail.trailhead_location.lng 
              },
              { 
                latitude: trail.coordinates.lat, 
                longitude: trail.coordinates.lng 
              },
            ];
          } else {
            // Fallback: create a simple line from park center to trail coordinates
            if (selectedPark.coordinates) {
              coordinates = [
                { 
                  latitude: selectedPark.coordinates.lat, 
                  longitude: selectedPark.coordinates.lng 
                },
                { 
                  latitude: trail.coordinates.lat, 
                  longitude: trail.coordinates.lng 
                },
              ];
            }
          }

          if (coordinates.length < 2) return null;

          return (
            <Polyline
              key={trail.id}
              coordinates={coordinates}
              strokeColor="#2D4739"
              strokeWidth={3}
              lineCap="round"
              lineJoin="round"
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
  locationPermissionBanner: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  locationPermissionText: {
    fontSize: 13,
    color: '#856404',
    marginBottom: 8,
    lineHeight: 18,
  },
  enableLocationButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#2D4739',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  enableLocationText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyStateBanner: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9F9F7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#8E8B82',
    lineHeight: 18,
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

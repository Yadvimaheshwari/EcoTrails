/**
 * Active Hike Screen - Screen-free mode with minimal UI
 * Shows AllTrails-style navigation and real-time observations
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import EcoDroidService from '../services/EcoDroidService';
import WearableService from '../services/WearableService';
import { useNavigation, useRoute } from '@react-navigation/native';

interface Observation {
  id: string;
  type: string;
  observation: string;
  features?: string[];
  timestamp: number;
  location?: { lat: number; lng: number };
  confidence?: 'Low' | 'Medium' | 'High';
}

const ActiveHikeScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Type-safe route params
  type RouteParams = {
    sessionId: string;
    parkName: string;
    deviceId: string;
  };
  const params = (route.params || {}) as RouteParams;
  const { sessionId, parkName, deviceId } = params;
  
  // Safety check - if params are missing, show error
  if (!sessionId || !parkName || !deviceId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Missing required parameters</Text>
      </View>
    );
  }

  const [observations, setObservations] = useState<Observation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routePath, setRoutePath] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [isMinimalMode, setIsMinimalMode] = useState(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    // Initialize services
    const initServices = async () => {
      await WearableService.initialize();
      
      // Connect to EcoDroid device
      if (deviceId && sessionId) {
        try {
          await EcoDroidService.connect(deviceId, sessionId);
          
          // Set up observation callback
          EcoDroidService.onObservation((observation) => {
            setObservations((prev) => [observation, ...prev]);
            
            // Send to wearable if significant
            if (observation.confidence === 'High') {
              WearableService.sendAlert({
                type: 'environmental',
                message: observation.observation || 'Environmental observation',
                vibration: 'gentle',
              });
            }
          });
        } catch (error: any) {
          console.error('EcoDroid connection error:', error);
          Alert.alert(
            'Connection Error',
            'Failed to connect to EcoDroid device. The app will continue in demo mode.',
            [{ text: 'OK' }]
          );
        }
      }
    };

    initServices();

    // Start location tracking
    const locationInterval = setInterval(() => {
      // In production, use expo-location
      // For now, simulate location updates
      const newLocation = {
        lat: 37.7749 + Math.random() * 0.01,
        lng: -122.4194 + Math.random() * 0.01,
      };
      setCurrentLocation(newLocation);
      setRoutePath((prev) => [...prev, { latitude: newLocation.lat, longitude: newLocation.lng }]);
      
      // Update map
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: newLocation.lat,
          longitude: newLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    }, 5000);

    return () => {
      clearInterval(locationInterval);
      EcoDroidService.endSession();
    };
  }, [deviceId, sessionId]);

  const handleEndHike = () => {
    Alert.alert(
      'End Hike',
      'Are you sure you want to end this hike?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          onPress: () => {
            EcoDroidService.endSession();
            navigation.navigate('PostHike', { sessionId });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Minimal Map View - AllTrails style */}
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation
        showsMyLocationButton={false}
        followsUserLocation
        mapType="terrain"
      >
        {/* Trail route */}
        {routePath.length > 1 && (
          <Polyline
            coordinates={routePath}
            strokeColor="#2D4739"
            strokeWidth={4}
          />
        )}
        
        {/* Observation markers */}
        {observations
          .filter((obs) => obs.location)
          .map((obs) => (
            <Marker
              key={obs.id}
              coordinate={{
                latitude: obs.location!.lat,
                longitude: obs.location!.lng,
              }}
              title={obs.observation}
            />
          ))}
      </MapView>

      {/* Minimal UI Overlay */}
      {isMinimalMode ? (
        <View style={styles.minimalOverlay}>
          <Text style={styles.parkName}>{parkName}</Text>
          {observations.length > 0 && (
            <View style={styles.latestObservation}>
              <Text style={styles.observationText} numberOfLines={2}>
                {observations[0].observation}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.expandedOverlay}>
          <Text style={styles.overlayTitle}>Real-time Observations</Text>
          {observations.slice(0, 5).map((obs) => (
            <View key={obs.id} style={styles.observationCard}>
              <Text style={styles.observationType}>{obs.type}</Text>
              <Text style={styles.observationText}>{obs.observation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* End Hike Button */}
      <TouchableOpacity style={styles.endButton} onPress={handleEndHike}>
        <Text style={styles.endButtonText}>End Hike</Text>
      </TouchableOpacity>

      {/* Toggle UI Button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsMinimalMode(!isMinimalMode)}
      >
        <Text style={styles.toggleButtonText}>
          {isMinimalMode ? 'Expand' : 'Minimize'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F7',
  },
  map: {
    flex: 1,
  },
  minimalOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  expandedOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    bottom: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  parkName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D4739',
    marginBottom: 8,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D4739',
    marginBottom: 12,
  },
  latestObservation: {
    marginTop: 8,
  },
  observationCard: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F9F9F7',
    borderRadius: 8,
  },
  observationType: {
    fontSize: 12,
    color: '#8E8B82',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  observationText: {
    fontSize: 14,
    color: '#2D4739',
  },
  endButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  endButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#2D4739',
    padding: 12,
    borderRadius: 8,
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 50,
  },
});

export default ActiveHikeScreen;

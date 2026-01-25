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
import * as Location from 'expo-location';
import EcoDroidService from '../services/EcoDroidService';
import WearableService from '../services/WearableService';
import GeminiCompanionService, { CompanionMessage } from '../services/GeminiCompanionService';
import CompanionChat from '../components/CompanionChat';
import ApiService from '../services/ApiService';
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
    deviceId: string | null; // Optional - EcoDroid device not required
  };
  const params = (route.params || {}) as RouteParams;
  const { sessionId, parkName, deviceId } = params;
  
  // Safety check - sessionId and parkName are required, deviceId is optional
  if (!sessionId || !parkName) {
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
  const [showCompanionChat, setShowCompanionChat] = useState(false);
  const [companionInsights, setCompanionInsights] = useState<CompanionMessage[]>([]);
  const [proactiveSuggestion, setProactiveSuggestion] = useState<CompanionMessage | null>(null);
  const [hikeStartTime] = useState(Date.now());
  const [pausedTime, setPausedTime] = useState(0); // Total time paused in milliseconds
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // Active time in milliseconds
  const locationTrackingInterval = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<MapView>(null);

  // Helper function to get current season
  const getSeason = (): string => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  };

  // Location tracking effect
  useEffect(() => {
    if (!isPaused) {
      // Start location tracking when not paused
      locationTrackingInterval.current = setInterval(async () => {
        try {
          const location = await Location.getCurrentPositionAsync({});
          const newPoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          
          setCurrentLocation({ lat: newPoint.latitude, lng: newPoint.longitude });
          setRoutePath(prev => [...prev, newPoint]);
          
          // Update distance (simple calculation - in production, use proper distance calculation)
          if (routePath.length > 0) {
            const lastPoint = routePath[routePath.length - 1];
            const distance = calculateDistance(
              lastPoint.latitude,
              lastPoint.longitude,
              newPoint.latitude,
              newPoint.longitude
            );
            setTotalDistance(prev => prev + distance);
          }
          
          // Update map
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: newPoint.latitude,
              longitude: newPoint.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }
        } catch (err) {
          console.error('Error getting location:', err);
        }
      }, 5000);
    } else {
      // Stop tracking when paused
      if (locationTrackingInterval.current) {
        clearInterval(locationTrackingInterval.current);
        locationTrackingInterval.current = null;
      }
    }
    
    return () => {
      if (locationTrackingInterval.current) {
        clearInterval(locationTrackingInterval.current);
      }
    };
  }, [isPaused, routePath]);

  // Helper function to calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    // Initialize services
    const initServices = async () => {
      await WearableService.initialize();
      
      // Initialize Gemini Companion (context will be updated when location is available)
      GeminiCompanionService.setContext({
        parkName,
        location: currentLocation || undefined,
        timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening',
        season: getSeason(),
      });

      // Get initial park info (async, don't block)
      GeminiCompanionService.getParkInfo(parkName).then((parkInfo) => {
        const welcomeMessage: CompanionMessage = {
          id: 'welcome',
          type: 'conversation',
          content: parkInfo,
          timestamp: Date.now(),
          priority: 'low',
        };
        setCompanionInsights([welcomeMessage]);
      }).catch((error) => {
        console.error('Error loading park info:', error);
      });

      // Connect to EcoDroid device (optional - app works without it)
      if (deviceId && sessionId) {
        try {
          await EcoDroidService.connect(deviceId, sessionId);
          
          // Set up observation callback
          EcoDroidService.onObservation(async (observation) => {
            setObservations((prev) => [observation, ...prev]);
            
            // Get intelligent insight from Gemini companion
            try {
              const insight = await GeminiCompanionService.getRealTimeInsight(
                observation.observation || 'Current surroundings',
                observation.location,
                observation.image
              );
              setCompanionInsights((prev) => [insight, ...prev].slice(0, 10)); // Keep last 10
            } catch (error) {
              console.error('Error getting companion insight:', error);
            }
            
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
          console.warn('EcoDroid device not available. App will work in manual mode.');
          // Don't show alert - device is optional
        }
      } else {
        console.log('No EcoDroid device connected. App running in manual mode.');
      }
    };

    initServices();

    // Get proactive suggestions periodically
    const suggestionInterval = setInterval(async () => {
      try {
        const suggestion = await GeminiCompanionService.getProactiveSuggestion();
        if (suggestion) {
          setProactiveSuggestion(suggestion);
          // Auto-dismiss after 10 seconds
          setTimeout(() => setProactiveSuggestion(null), 10000);
        }
      } catch (error) {
        console.error('Error getting suggestion:', error);
      }
    }, 60000); // Every minute

    // Check safety conditions periodically
    const safetyInterval = setInterval(async () => {
      try {
        const safetyAlert = await GeminiCompanionService.checkSafetyConditions();
        if (safetyAlert) {
          setCompanionInsights((prev) => [safetyAlert, ...prev].slice(0, 10));
          Alert.alert('Safety Alert', safetyAlert.content);
        }
      } catch (error) {
        console.error('Error checking safety:', error);
      }
    }, 300000); // Every 5 minutes

    return () => {
      clearInterval(suggestionInterval);
      clearInterval(safetyInterval);
      if (deviceId) {
        EcoDroidService.endSession();
      }
    };
  }, [deviceId, sessionId, parkName]);

  // Update companion context when location changes
  useEffect(() => {
    if (currentLocation) {
      GeminiCompanionService.setContext({
        parkName,
        location: currentLocation,
        timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening',
        season: getSeason(),
      });
    }
  }, [currentLocation, parkName]);

  // Location tracking effect - respects pause state
  useEffect(() => {
    if (isPaused) {
      // Stop tracking when paused
      if (locationTrackingInterval.current) {
        clearInterval(locationTrackingInterval.current);
        locationTrackingInterval.current = null;
      }
      return;
    }

    // Start/resume location tracking
    locationTrackingInterval.current = setInterval(async () => {
      try {
        const location = await Location.getCurrentPositionAsync({});
        const newLocation = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };
        
        setCurrentLocation(newLocation);
        
        // Add to route path
        const newPoint = { latitude: newLocation.lat, longitude: newLocation.lng };
        setRoutePath((prev) => {
          const updated = [...prev, newPoint];
          
          // Calculate distance increment
          if (prev.length > 0) {
            const lastPoint = prev[prev.length - 1];
            const distance = calculateDistance(
              lastPoint.latitude,
              lastPoint.longitude,
              newPoint.latitude,
              newPoint.longitude
            );
            setTotalDistance((current) => current + distance);
          }
          
          return updated;
        });
        
        // Update Gemini context
        GeminiCompanionService.setContext({
          parkName,
          location: newLocation,
          timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening',
          season: getSeason(),
        });
        
        // Update map
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: newLocation.lat,
            longitude: newLocation.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      } catch (error) {
        console.error('Error getting location:', error);
        // Continue tracking even if one location fails
      }
    }, 5000);

    return () => {
      if (locationTrackingInterval.current) {
        clearInterval(locationTrackingInterval.current);
        locationTrackingInterval.current = null;
      }
    };
  }, [isPaused, parkName]);

  // Update elapsed time display
  useEffect(() => {
    const timeInterval = setInterval(() => {
      if (!isPaused) {
        const now = Date.now();
        const activeTime = now - hikeStartTime - pausedTime;
        setElapsedTime(activeTime);
      }
    }, 1000);

    return () => clearInterval(timeInterval);
  }, [hikeStartTime, pausedTime, isPaused]);

  const handleEndHike = () => {
    Alert.alert(
      'End Hike',
      'Are you sure you want to end this hike?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: async () => {
            // Defensive: Always navigate to HikeSummary, even if API fails
            let apiSuccess = false;
            let apiError: string | null = null;
            
            try {
              // Stop tracking
              EcoDroidService.endSession();
              
              // Stop location tracking interval
              if (locationTrackingInterval.current) {
                clearInterval(locationTrackingInterval.current);
                locationTrackingInterval.current = null;
              }
              
              // Calculate final paused time if currently paused
              let finalPausedTime = pausedTime;
              if (isPaused && pauseStartTime) {
                finalPausedTime += Date.now() - pauseStartTime;
              }
              
              // Calculate active duration (excluding paused time)
              const activeDurationMs = Date.now() - hikeStartTime - finalPausedTime;
              const durationMinutes = Math.floor(activeDurationMs / 60000);
              
              // End session via API (but don't block navigation on failure)
              try {
                await ApiService.endHikeSession(sessionId, {
                  distance_miles: totalDistance,
                  duration_minutes: durationMinutes,
                  route_path: routePath.map((point, index) => ({
                    lat: point.latitude,
                    lng: point.longitude,
                    timestamp: new Date(hikeStartTime + index * 5000).toISOString(),
                  })),
                });
                apiSuccess = true;
              } catch (apiErr: any) {
                console.error('Error ending hike session via API:', apiErr);
                apiError = apiErr.message || 'Failed to save hike to server';
                // Continue to navigate even if API fails
              }

              // ALWAYS navigate to HikeSummary - defensive navigation
              // Pass error info so HikeSummary can show it if needed
              navigation.navigate('Activity' as never, {
                screen: 'HikeSummary',
                params: {
                  sessionId: sessionId || 'unknown',
                  distance_miles: totalDistance,
                  duration_minutes: durationMinutes,
                  route_path: routePath,
                  apiSuccess,
                  apiError,
                },
              } as never);
            } catch (error: any) {
              // Even if something catastrophic happens, navigate to summary with fallback data
              console.error('Critical error ending hike:', error);
              navigation.navigate('Activity' as never, {
                screen: 'HikeSummary',
                params: {
                  sessionId: sessionId || 'unknown',
                  distance_miles: totalDistance || 0,
                  duration_minutes: Math.floor((Date.now() - hikeStartTime) / 60000),
                  route_path: routePath || [],
                  apiSuccess: false,
                  apiError: error.message || 'Unknown error occurred',
                },
              } as never);
            }
          },
        },
      ]
    );
  };

  const handlePauseResume = () => {
    if (isPaused) {
      // Resuming: add the pause duration to total paused time
      if (pauseStartTime) {
        const pauseDuration = Date.now() - pauseStartTime;
        setPausedTime(prev => prev + pauseDuration);
        setPauseStartTime(null);
      }
      setIsPaused(false);
      // Location tracking will resume automatically via useEffect
    } else {
      // Pausing: record when pause started
      setPauseStartTime(Date.now());
      setIsPaused(true);
      // Location tracking will stop automatically via useEffect
    }
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

      {/* Companion Insights Overlay */}
      {companionInsights.length > 0 && companionInsights[0].type !== 'alert' && (
        <View style={styles.companionInsight}>
          <Text style={styles.companionInsightText} numberOfLines={3}>
            💡 {companionInsights[0].content}
          </Text>
        </View>
      )}

      {/* Proactive Suggestion */}
      {proactiveSuggestion && (
        <View style={styles.suggestionCard}>
          <Text style={styles.suggestionText}>💬 {proactiveSuggestion.content}</Text>
          <TouchableOpacity onPress={() => setProactiveSuggestion(null)} style={styles.dismissButton}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Stats Overlay */}
      <View style={styles.statsOverlay}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Time</Text>
          <Text style={styles.statValue}>
            {isPaused ? '⏸️ ' : ''}
            {Math.floor(elapsedTime / 60000)}:{(Math.floor(elapsedTime / 1000) % 60).toString().padStart(2, '0')}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{totalDistance.toFixed(2)} mi</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Pace</Text>
          <Text style={styles.statValue}>
            {totalDistance > 0 && elapsedTime > 0
              ? (Math.floor(elapsedTime / 1000 / 60) / totalDistance).toFixed(1)
              : '0.0'} min/mi
          </Text>
        </View>
      </View>

      {/* Pause/Resume Button */}
      <TouchableOpacity
        style={[styles.pauseButton, isPaused && styles.pauseButtonPaused]}
        onPress={handlePauseResume}
      >
        <Text style={styles.pauseButtonText}>
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </Text>
      </TouchableOpacity>

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

      {/* Companion Chat Button */}
      <TouchableOpacity
        style={styles.companionButton}
        onPress={() => setShowCompanionChat(true)}
      >
        <Text style={styles.companionButtonText}>🤖 Ask Atlas</Text>
      </TouchableOpacity>

      {/* Companion Chat Modal */}
      {showCompanionChat && (
        <View style={styles.chatModal}>
          <CompanionChat
            parkName={parkName}
            location={currentLocation || undefined}
            onClose={() => setShowCompanionChat(false)}
          />
        </View>
      )}
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
  statsOverlay: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8B82',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D4739',
  },
  pauseButton: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#2D4739',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  pauseButtonPaused: {
    backgroundColor: '#8E8B82',
  },
  pauseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
  companionInsight: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(45, 71, 57, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  companionInsightText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionCard: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
    backgroundColor: '#E2E8DE',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  suggestionText: {
    flex: 1,
    color: '#2D4739',
    fontSize: 13,
    lineHeight: 18,
  },
  dismissButton: {
    marginLeft: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(45, 71, 57, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    color: '#2D4739',
    fontSize: 12,
    fontWeight: 'bold',
  },
  companionButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#2D4739',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  companionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  chatModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F9F9F7',
    zIndex: 1000,
  },
});

export default ActiveHikeScreen;

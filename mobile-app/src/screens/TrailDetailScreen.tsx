/**
 * Trail Detail Screen
 * THE ONLY PLACE WHERE A HIKE CAN START
 * Shows trail information and "Start Trail" button
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import ApiService, { Trail } from '../services/ApiService';

type HikeSessionState = 'idle' | 'confirming' | 'countdown' | 'creating_session' | 'active' | 'error';

const TrailDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const trailId = (route.params as any)?.trailId;

  const [trail, setTrail] = useState<Trail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hikeState, setHikeState] = useState<HikeSessionState>('idle');
  const [countdown, setCountdown] = useState(3);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (trailId) {
      loadTrailDetail();
    } else {
      setError('Trail ID is required');
      setLoading(false);
    }
  }, [trailId]);

  // Countdown effect
  useEffect(() => {
    if (hikeState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (hikeState === 'countdown' && countdown === 0) {
      createHikeSession();
    }
  }, [hikeState, countdown]);

  const loadTrailDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const trailData = await ApiService.getTrailDetail(trailId);
      
      // Defensive check: ensure park_id exists
      if (!trailData.park_id) {
        throw new Error('Trail is missing park_id. Cannot start hike.');
      }
      
      setTrail(trailData);
    } catch (err: any) {
      setError(err.message || 'Failed to load trail details');
      console.error('Error loading trail detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrail = () => {
    // Defensive check: ensure trail and park_id exist
    if (!trail) {
      Alert.alert('Error', 'Trail information not loaded');
      return;
    }

    if (!trail.park_id) {
      Alert.alert('Error', 'Trail is missing park information. Cannot start hike.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmStart = () => {
    setShowConfirmModal(false);
    setHikeState('countdown');
    setCountdown(3);
  };

  const createHikeSession = async () => {
    // Defensive guards: ensure trail and required fields are never null
    if (!trail) {
      setHikeState('error');
      Alert.alert('Error', 'Trail information not loaded');
      return;
    }

    if (!trail.id) {
      setHikeState('error');
      Alert.alert('Error', 'Trail ID is missing');
      return;
    }

    if (!trail.park_id) {
      setHikeState('error');
      Alert.alert('Error', 'Trail is missing park information. Cannot start hike.');
      return;
    }

    try {
      setHikeState('creating_session');
      
      // Fetch actual park name from park detail
      let parkName: string;
      try {
        const parkDetail = await ApiService.getParkDetail(trail.park_id);
        parkName = parkDetail.name;
      } catch (parkError) {
        console.error('Error fetching park detail:', parkError);
        // Fallback to park_id if fetch fails, but log the error
        parkName = trail.park_id;
      }
      
      // Defensive check: ensure parkName is valid
      if (!parkName || parkName.trim().length === 0) {
        throw new Error('Park name is required but could not be determined');
      }
      
      const session = await ApiService.createHikeSession({
        user_id: 'current-user-id', // TODO: Get from auth
        trail_id: trail.id,
        park_id: trail.park_id,
        park_name: parkName,
      });

      // Defensive check: ensure session was created successfully
      if (!session || !session.id) {
        throw new Error('Failed to create hike session: invalid response');
      }

      // Navigate to ActiveHike screen
      setHikeState('active');
      navigation.navigate('ActiveHike' as never, {
        sessionId: session.id,
        trailId: trail.id,
        parkId: trail.park_id,
        parkName: parkName,
      } as never);
    } catch (err: any) {
      setHikeState('error');
      const errorMessage = err.message || 'An error occurred while creating the hike session. Please try again.';
      Alert.alert(
        'Failed to Start Hike',
        errorMessage,
        [
          {
            text: 'OK',
            onPress: () => setHikeState('idle'),
          },
        ]
      );
      console.error('Error creating hike session:', err);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'moderate': return '#FF9800';
      case 'hard': return '#F44336';
      case 'expert': return '#9C27B0';
      default: return '#8E8B82';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D4739" />
          <Text style={styles.loadingText}>Loading trail details...</Text>
        </View>
      </View>
    );
  }

  if (error || !trail) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to load trail</Text>
          <Text style={styles.errorMessage}>{error || 'Trail not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTrailDetail}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Generate map coordinates for trail
  const mapCoordinates = trail.waypoints && trail.waypoints.length > 0
    ? trail.waypoints.map(wp => ({ latitude: wp.lat, longitude: wp.lng }))
    : trail.trailhead_location
    ? [
        { latitude: trail.trailhead_location.lat, longitude: trail.trailhead_location.lng },
        { latitude: trail.coordinates.lat, longitude: trail.coordinates.lng },
      ]
    : [{ latitude: trail.coordinates.lat, longitude: trail.coordinates.lng }];

  const mapRegion = {
    latitude: trail.coordinates.lat,
    longitude: trail.coordinates.lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.trailName}>{trail.name}</Text>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.difficultyBadge,
                { backgroundColor: getDifficultyColor(trail.difficulty) },
              ]}
            >
              <Text style={styles.difficultyText}>{trail.difficulty.toUpperCase()}</Text>
            </View>
            {trail.rating && (
              <View style={styles.rating}>
                <Text style={styles.ratingText}>⭐ {trail.rating.toFixed(1)}</Text>
                {trail.review_count && (
                  <Text style={styles.reviewCount}>({trail.review_count})</Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{trail.length_miles.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Miles</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{trail.elevation_gain_ft}</Text>
            <Text style={styles.statLabel}>Elevation Gain</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{trail.estimated_duration_hours.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Hours</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{trail.route_type.replace('-', ' ')}</Text>
            <Text style={styles.statLabel}>Route Type</Text>
          </View>
        </View>

        {/* Description */}
        {trail.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{trail.description}</Text>
          </View>
        )}

        {/* Features */}
        {trail.features && trail.features.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.features}>
              {trail.features.map((feature, index) => (
                <View key={index} style={styles.featureTag}>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Weather Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weather</Text>
          <View style={styles.weatherWidget}>
            <Text style={styles.weatherText}>🌤️ Current conditions unavailable</Text>
            <Text style={styles.weatherSubtext}>Weather data coming soon</Text>
            <Text style={styles.weatherNote}>
              Check local weather services before your hike
            </Text>
          </View>
        </View>

        {/* Reviews Section */}
        {trail.rating && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Reviews {trail.review_count ? `(${trail.review_count})` : ''}
            </Text>
            <View style={styles.ratingSummary}>
              <View style={styles.ratingDisplay}>
                <Text style={styles.ratingValue}>{trail.rating.toFixed(1)}</Text>
                <Text style={styles.ratingStars}>⭐⭐⭐⭐⭐</Text>
                {trail.review_count && (
                  <Text style={styles.ratingCount}>{trail.review_count} reviews</Text>
                )}
              </View>
            </View>
            <View style={styles.reviewsPlaceholder}>
              <Text style={styles.reviewsPlaceholderText}>
                📝 Detailed reviews coming soon
              </Text>
              <Text style={styles.reviewsPlaceholderSubtext}>
                User reviews and ratings will be displayed here
              </Text>
            </View>
          </View>
        )}

        {/* Map Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trail Map</Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={mapRegion}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              {mapCoordinates.length > 1 && (
                <Polyline
                  coordinates={mapCoordinates}
                  strokeColor="#2D4739"
                  strokeWidth={4}
                />
              )}
              {trail.trailhead_location && (
                <Marker
                  coordinate={{
                    latitude: trail.trailhead_location.lat,
                    longitude: trail.trailhead_location.lng,
                  }}
                  title="Trailhead"
                  pinColor="#2D4739"
                />
              )}
              <Marker
                coordinate={{
                  latitude: trail.coordinates.lat,
                  longitude: trail.coordinates.lng,
                }}
                title="Trail End"
                pinColor="#8E8B82"
              />
            </MapView>
          </View>
        </View>
      </ScrollView>

      {/* Start Trail Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.startButton,
            (hikeState !== 'idle' && hikeState !== 'error') && styles.startButtonDisabled,
          ]}
          onPress={handleStartTrail}
          disabled={hikeState !== 'idle' && hikeState !== 'error'}
        >
          {hikeState === 'idle' && (
            <Text style={styles.startButtonText}>Start Trail</Text>
          )}
          {hikeState === 'countdown' && (
            <Text style={styles.startButtonText}>Starting in {countdown}...</Text>
          )}
          {hikeState === 'creating_session' && (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.startButtonText}>Creating session...</Text>
            </>
          )}
          {hikeState === 'error' && (
            <Text style={styles.startButtonText}>Try Again</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start this hike now?</Text>
            <Text style={styles.modalMessage}>
              You're about to start recording your hike on {trail.name}. Make sure you're ready!
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirmStart}
              >
                <Text style={styles.modalButtonConfirmText}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F7',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
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
  errorIcon: {
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
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8DE',
  },
  trailName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D4739',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D4739',
  },
  reviewCount: {
    fontSize: 14,
    color: '#8E8B82',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8DE',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D4739',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
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
  description: {
    fontSize: 16,
    color: '#2D4739',
    lineHeight: 24,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    backgroundColor: '#E2E8DE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  featureText: {
    fontSize: 14,
    color: '#2D4739',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  map: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8DE',
  },
  startButton: {
    backgroundColor: '#2D4739',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#8E8B82',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D4739',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#8E8B82',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F9F9F7',
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  modalButtonCancelText: {
    color: '#2D4739',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonConfirm: {
    backgroundColor: '#2D4739',
  },
  modalButtonConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TrailDetailScreen;

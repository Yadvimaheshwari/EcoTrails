/**
 * PlaceDetailScreen (Mobile)
 * Park/place detail screen with trail selection bottom sheet
 * Updated with gamified discovery preview
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../config/api';
import { EmptyState } from '../components/ui/EmptyState';
import { TrailSelectSheet } from '../components/discovery/TrailSelectSheet';
import { useHikeStore } from '../store/useHikeStore';
import { formatMiles, formatFeet } from '../utils/formatting';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.35;

interface Trail {
  id: string;
  name: string;
  difficulty?: string;
  lengthMiles?: number;
  length_miles?: number;
  elevationGainFeet?: number;
  elevation_gain_feet?: number;
  estimatedDurationMinutes?: number;
  estimated_duration_minutes?: number;
  description?: string;
  loopType?: string;
  loop_type?: string;
  rating?: number;
  routeGeometry?: Array<{ lat: number; lng: number }>;
  route_geometry?: Array<{ lat: number; lng: number }>;
}

interface Place {
  id: string;
  name: string;
  description?: string;
  lat?: number;
  lng?: number;
  imageUrl?: string;
  image_url?: string;
  wildlife?: Array<{ name: string; category: string; likelihood: string }>;
  activities?: Array<{ name: string; xp: number; description: string }>;
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  easy: { bg: '#D1FAE5', text: '#065F46' },
  moderate: { bg: '#FEF3C7', text: '#92400E' },
  hard: { bg: '#FFEDD5', text: '#9A3412' },
  expert: { bg: '#FEE2E2', text: '#991B1B' },
};

export const PlaceDetailScreen: React.FC = ({ route, navigation }: any) => {
  const { placeId } = route.params;
  const [place, setPlace] = useState<Place | null>(null);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [startingHike, setStartingHike] = useState(false);
  const [wildlife, setWildlife] = useState<Array<{ name: string; category: string; likelihood: string }>>([]);
  const [activities, setActivities] = useState<Array<{ name: string; xp: number; description: string }>>([]);
  const { startHike } = useHikeStore();

  useEffect(() => {
    loadPlaceData();
  }, [placeId]);

  const loadPlaceData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/places/${placeId}`);
      const data = response.data;
      setPlace(data.place);
      setTrails(data.trails || []);
      
      // Load wildlife and activities from API or use fallback data
      if (data.wildlife) {
        setWildlife(data.wildlife);
      } else {
        // Generate realistic wildlife based on park type
        setWildlife([
          { name: 'Black-tailed Deer', category: 'animal', likelihood: 'high' },
          { name: 'Steller\'s Jay', category: 'bird', likelihood: 'high' },
          { name: 'Coast Redwood', category: 'plant', likelihood: 'high' },
          { name: 'Banana Slug', category: 'animal', likelihood: 'medium' },
          { name: 'Red-tailed Hawk', category: 'bird', likelihood: 'medium' },
          { name: 'California Newt', category: 'animal', likelihood: 'low' },
        ]);
      }
      
      if (data.activities) {
        setActivities(data.activities);
      } else {
        // Generate realistic activities
        setActivities([
          { name: 'Complete a loop trail', xp: 50, description: 'Finish any loop trail' },
          { name: 'Sunrise hike', xp: 40, description: 'Start hiking before 7 AM' },
          { name: 'Photo challenge', xp: 30, description: 'Capture 5 discoveries' },
          { name: 'Summit push', xp: 75, description: 'Reach the highest point' },
        ]);
      }
    } catch (error: any) {
      console.error('Failed to load place:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrailSelect = (trail: Trail) => {
    // Normalize trail data
    const normalizedTrail: Trail = {
      ...trail,
      lengthMiles: trail.lengthMiles ?? trail.length_miles,
      elevationGainFeet: trail.elevationGainFeet ?? trail.elevation_gain_feet,
      estimatedDurationMinutes: trail.estimatedDurationMinutes ?? trail.estimated_duration_minutes,
      loopType: trail.loopType ?? trail.loop_type,
      routeGeometry: trail.routeGeometry ?? trail.route_geometry,
    };
    setSelectedTrail(normalizedTrail);
    setSheetVisible(true);
  };

  const handleCloseSheet = () => {
    setSheetVisible(false);
    setTimeout(() => setSelectedTrail(null), 200);
  };

  const handleStartHike = async () => {
    if (!selectedTrail) return;

    setStartingHike(true);
    try {
      await startHike(selectedTrail.id, placeId, selectedTrail.name);
      handleCloseSheet();

      // Navigate to the hike screen
      navigation.navigate('DuringHike', {
        trailId: selectedTrail.id,
        trailName: selectedTrail.name,
        placeId,
        parkName: place?.name,
      });
    } catch (error) {
      console.error('Failed to start hike:', error);
    } finally {
      setStartingHike(false);
    }
  };

  const getMapRegion = useCallback(() => {
    if (place?.lat && place?.lng) {
      return {
        latitude: place.lat,
        longitude: place.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    // Default to US center
    return {
      latitude: 39.8283,
      longitude: -98.5795,
      latitudeDelta: 20,
      longitudeDelta: 20,
    };
  }, [place]);

  const getDifficultyStyle = (difficulty?: string) => {
    const key = difficulty?.toLowerCase() || 'easy';
    return DIFFICULTY_COLORS[key] || DIFFICULTY_COLORS.easy;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="body" color="secondary" style={styles.loadingText}>
            Loading park details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text variant="h3" numberOfLines={1} style={styles.headerTitle}>
            {place?.name || 'Park Details'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Map Preview */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={getMapRegion()}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            {/* Trail polylines */}
            {trails.map((trail) => {
              const geometry = trail.routeGeometry || trail.route_geometry;
              if (!geometry || geometry.length === 0) return null;
              return (
                <Polyline
                  key={trail.id}
                  coordinates={geometry.map((p) => ({
                    latitude: p.lat,
                    longitude: p.lng,
                  }))}
                  strokeColor={colors.primary}
                  strokeWidth={3}
                />
              );
            })}
            {/* Park marker */}
            {place?.lat && place?.lng && (
              <Marker
                coordinate={{ latitude: place.lat, longitude: place.lng }}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View style={styles.parkMarker}>
                  <Ionicons name="location" size={24} color={colors.primary} />
                </View>
              </Marker>
            )}
          </MapView>

          {/* Discovery Badge on Map */}
          <View style={styles.discoveryBadgeOnMap}>
            <Text style={styles.discoveryBadgeIcon}>🔍</Text>
            <Text variant="caption" style={styles.discoveryBadgeText}>
              Discoveries await!
            </Text>
          </View>
        </View>

        {/* Place Info */}
        {place && (
          <View style={styles.placeInfo}>
            <Text variant="h2" style={styles.title}>
              {place.name}
            </Text>
            {place.description && (
              <Text variant="body" color="secondary" style={styles.description}>
                {place.description}
              </Text>
            )}
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{trails.length}</Text>
            <Text variant="caption" color="secondary">
              Trails
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              {trails.reduce((acc, t) => acc + (t.lengthMiles || t.length_miles || 0), 0).toFixed(1)}
            </Text>
            <Text variant="caption" color="secondary">
              Total Miles
            </Text>
          </View>
        </View>

        {/* Wildlife You May Spot */}
        {wildlife.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="h3">🦌 Wildlife You May Spot</Text>
            </View>
            <View style={styles.wildlifeGrid}>
              {wildlife.map((item, index) => {
                const icons: Record<string, string> = {
                  animal: '🦌',
                  bird: '🦅',
                  plant: '🌿',
                  insect: '🦋',
                };
                const likelihoodColors: Record<string, { bg: string; text: string }> = {
                  high: { bg: '#D1FAE5', text: '#059669' },
                  medium: { bg: '#FEF3C7', text: '#D97706' },
                  low: { bg: '#EDE9FE', text: '#7C3AED' },
                };
                const likeColor = likelihoodColors[item.likelihood] || likelihoodColors.medium;
                
                return (
                  <View key={index} style={styles.wildlifeItem}>
                    <Text style={styles.wildlifeIcon}>{icons[item.category] || '🐾'}</Text>
                    <View style={styles.wildlifeInfo}>
                      <Text variant="body" style={styles.wildlifeName}>{item.name}</Text>
                      <View style={[styles.likelihoodBadge, { backgroundColor: likeColor.bg }]}>
                        <Text style={[styles.likelihoodText, { color: likeColor.text }]}>
                          {item.likelihood} chance
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Activities & Challenges */}
        {activities.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="h3">🎯 Activities & Challenges</Text>
            </View>
            <View style={styles.activitiesList}>
              {activities.map((activity, index) => (
                <Card key={index} style={styles.activityCard}>
                  <View style={styles.activityContent}>
                    <View style={styles.activityMain}>
                      <Text variant="body" style={styles.activityName}>{activity.name}</Text>
                      <Text variant="caption" color="secondary">{activity.description}</Text>
                    </View>
                    <View style={styles.activityXp}>
                      <Text style={styles.xpIcon}>⚡</Text>
                      <Text style={styles.xpValue}>+{activity.xp}</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Trails Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h3">Trails</Text>
            <Text variant="caption" color="secondary">
              Tap a trail to see details
            </Text>
          </View>

          {trails.length === 0 ? (
            <EmptyState
              icon="map-outline"
              title="No trails found"
              message="This park doesn't have any trails yet"
            />
          ) : (
            <FlatList
              data={trails}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const diffStyle = getDifficultyStyle(item.difficulty);
                const length = item.lengthMiles ?? item.length_miles;
                const elevation = item.elevationGainFeet ?? item.elevation_gain_feet;

                return (
                  <TouchableOpacity
                    onPress={() => handleTrailSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Card style={styles.trailCard}>
                      <View style={styles.trailCardHeader}>
                        <Text variant="h3" numberOfLines={1} style={styles.trailName}>
                          {item.name}
                        </Text>
                        <View
                          style={[styles.difficultyBadge, { backgroundColor: diffStyle.bg }]}
                        >
                          <Text style={[styles.difficultyText, { color: diffStyle.text }]}>
                            {item.difficulty || 'Easy'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.trailStats}>
                        <View style={styles.trailStat}>
                          <Ionicons
                            name="footsteps-outline"
                            size={16}
                            color={colors.textSecondary}
                          />
                          <Text variant="caption" color="secondary">
                            {formatMiles(length)} mi
                          </Text>
                        </View>
                        {elevation && elevation > 0 && (
                          <View style={styles.trailStat}>
                            <Ionicons
                              name="trending-up-outline"
                              size={16}
                              color={colors.textSecondary}
                            />
                            <Text variant="caption" color="secondary">
                              {formatFeet(elevation)} ft
                            </Text>
                          </View>
                        )}
                        {item.rating && (
                          <View style={styles.trailStat}>
                            <Ionicons name="star" size={16} color="#F59E0B" />
                            <Text variant="caption" color="secondary">
                              {item.rating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.trailCardFooter}>
                        <View style={styles.discoveryHint}>
                          <Text style={styles.discoveryHintIcon}>🔍</Text>
                          <Text variant="caption" color="secondary">
                            Hidden discoveries to find!
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={colors.textTertiary}
                        />
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {/* Bottom padding for safe area */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Trail Select Bottom Sheet */}
      <TrailSelectSheet
        visible={sheetVisible}
        trail={selectedTrail}
        parkName={place?.name}
        onClose={handleCloseSheet}
        onStartHike={handleStartHike}
        loading={startingHike}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: MAP_HEIGHT,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  parkMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  discoveryBadgeOnMap: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  discoveryBadgeIcon: {
    fontSize: 16,
  },
  discoveryBadgeText: {
    color: colors.primary,
    fontWeight: '600',
  },
  placeInfo: {
    padding: 20,
    paddingBottom: 0,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    lineHeight: 22,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quickStat: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  quickStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  section: {
    padding: 20,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trailCard: {
    marginBottom: 12,
    padding: 16,
  },
  trailCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trailName: {
    flex: 1,
    marginRight: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  trailStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  trailStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trailCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  discoveryHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discoveryHintIcon: {
    fontSize: 14,
  },
  bottomPadding: {
    height: 40,
  },
  // Wildlife styles
  wildlifeGrid: {
    gap: 12,
  },
  wildlifeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  wildlifeIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  wildlifeInfo: {
    flex: 1,
  },
  wildlifeName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  likelihoodBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  likelihoodText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  // Activities styles
  activitiesList: {
    gap: 8,
  },
  activityCard: {
    padding: 12,
    marginBottom: 0,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityMain: {
    flex: 1,
  },
  activityName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  activityXp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  xpIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  xpValue: {
    color: '#D97706',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

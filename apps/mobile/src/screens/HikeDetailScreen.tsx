/**
 * HikeDetailScreen (Mobile)
 * 
 * Comprehensive hike detail view for the journal, showing:
 * - Route map
 * - Stats (distance, elevation, time)
 * - Captured discoveries
 * - Earned badges
 * - Wildlife & activities spotted
 * - AI-generated insights
 * 
 * Mobile Developers: This fetches real data from the backend API.
 * Uses Gemini for generating insights (handled server-side).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../config/api';
import { Badge, BADGE_LEVEL_COLORS } from '../types/badge';
import { CapturedDiscovery, DISCOVERY_ICONS } from '../types/discovery';
import { formatMiles, formatFeet, formatElapsedTime } from '../utils/formatting';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HikeData {
  id: string;
  name?: string;
  trail_id?: string;
  trail?: {
    id: string;
    name: string;
    distance_miles?: number;
    elevation_gain_feet?: number;
  };
  place?: {
    id: string;
    name: string;
  };
  start_time?: string;
  end_time?: string;
  distance_miles?: number;
  elevation_gain_feet?: number;
  duration_seconds?: number;
  status: string;
  route_points?: Array<{ lat: number; lng: number; timestamp?: string }>;
  discoveries?: CapturedDiscovery[];
  badges?: Badge[];
  wildlife?: Array<{ name: string; category: string; confidence: number }>;
  activities?: Array<{ name: string; xp: number }>;
  insight?: {
    summary?: string;
    analysis?: Record<string, any>;
    status: string;
  };
}

export const HikeDetailScreen: React.FC = ({ route, navigation }: any) => {
  const { hikeId } = route.params;
  const [hike, setHike] = useState<HikeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'discoveries' | 'insights'>('overview');

  useEffect(() => {
    loadHikeDetail();
  }, [hikeId]);

  const loadHikeDetail = async () => {
    try {
      setError(null);
      const response = await api.get(`/api/v1/hikes/${hikeId}`);
      setHike(response.data);

      // Also try to load discoveries and badges
      try {
        const [discoveriesRes, badgesRes] = await Promise.all([
          api.get(`/api/v1/hikes/${hikeId}/discoveries`).catch(() => ({ data: { discoveries: [] } })),
          api.get(`/api/v1/hikes/${hikeId}/badges`).catch(() => ({ data: { badges: [] } })),
        ]);
        
        setHike(prev => prev ? {
          ...prev,
          discoveries: discoveriesRes.data.discoveries || [],
          badges: badgesRes.data.badges || [],
        } : null);
      } catch (err) {
        console.warn('[HikeDetail] Could not load discoveries/badges:', err);
      }

      // Try to load insights
      try {
        const insightRes = await api.get(`/api/v1/hikes/${hikeId}/insights`);
        if (insightRes.data.insight) {
          setHike(prev => prev ? {
            ...prev,
            insight: insightRes.data.insight,
          } : null);
        }
      } catch (err) {
        console.warn('[HikeDetail] Could not load insights:', err);
      }
    } catch (err: any) {
      console.error('[HikeDetail] Failed to load hike:', err);
      setError('Failed to load hike details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHikeDetail();
  }, []);

  const handleShare = async () => {
    if (!hike) return;
    
    try {
      const trailName = hike.trail?.name || hike.name || 'a trail';
      const distance = hike.distance_miles ? ` - ${formatMiles(hike.distance_miles)}` : '';
      
      await Share.share({
        message: `I just hiked ${trailName}${distance} on EcoTrails! 🥾🌲`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const getMapRegion = () => {
    if (!hike?.route_points || hike.route_points.length === 0) {
      return {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    const lats = hike.route_points.map(p => p.lat);
    const lngs = hike.route_points.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.3),
      longitudeDelta: Math.max(0.01, (maxLng - minLng) * 1.3),
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingState message="Loading hike details..." />
      </SafeAreaView>
    );
  }

  if (error || !hike) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Couldn't load hike"
          message={error || 'Hike not found'}
        />
      </SafeAreaView>
    );
  }

  const hikeName = hike.trail?.name || hike.name || 'Unnamed Hike';
  const parkName = hike.place?.name || '';
  const durationSeconds = hike.duration_seconds || (
    hike.start_time && hike.end_time 
      ? (new Date(hike.end_time).getTime() - new Date(hike.start_time).getTime()) / 1000 
      : 0
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={getMapRegion()}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            {hike.route_points && hike.route_points.length > 0 && (
              <>
                <Polyline
                  coordinates={hike.route_points.map(p => ({
                    latitude: p.lat,
                    longitude: p.lng,
                  }))}
                  strokeColor={colors.primary}
                  strokeWidth={4}
                />
                <Marker
                  coordinate={{
                    latitude: hike.route_points[0].lat,
                    longitude: hike.route_points[0].lng,
                  }}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={styles.startMarker}>
                    <Text style={styles.markerText}>🏁</Text>
                  </View>
                </Marker>
                <Marker
                  coordinate={{
                    latitude: hike.route_points[hike.route_points.length - 1].lat,
                    longitude: hike.route_points[hike.route_points.length - 1].lng,
                  }}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={styles.endMarker}>
                    <Text style={styles.markerText}>⛳</Text>
                  </View>
                </Marker>
              </>
            )}
          </MapView>
        </View>

        {/* Title & Date */}
        <View style={styles.titleSection}>
          <Text variant="h2">{hikeName}</Text>
          {parkName && (
            <Text variant="body" color="secondary" style={styles.parkName}>
              {parkName}
            </Text>
          )}
          {hike.start_time && (
            <Text variant="caption" color="secondary" style={styles.date}>
              {format(new Date(hike.start_time), 'EEEE, MMMM d, yyyy')}
            </Text>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📍</Text>
            <Text style={styles.statValue}>
              {hike.distance_miles ? formatMiles(hike.distance_miles) : '--'}
            </Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⛰️</Text>
            <Text style={styles.statValue}>
              {hike.elevation_gain_feet ? formatFeet(hike.elevation_gain_feet) : '--'}
            </Text>
            <Text style={styles.statLabel}>Elevation</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⏱️</Text>
            <Text style={styles.statValue}>
              {durationSeconds ? formatElapsedTime(durationSeconds) : '--'}
            </Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔍</Text>
            <Text style={styles.statValue}>
              {hike.discoveries?.length || 0}
            </Text>
            <Text style={styles.statLabel}>Discoveries</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'discoveries' && styles.tabActive]}
            onPress={() => setActiveTab('discoveries')}
          >
            <Text style={[styles.tabText, activeTab === 'discoveries' && styles.tabTextActive]}>
              Discoveries
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'insights' && styles.tabActive]}
            onPress={() => setActiveTab('insights')}
          >
            <Text style={[styles.tabText, activeTab === 'insights' && styles.tabTextActive]}>
              Insights
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Badges Section */}
            {hike.badges && hike.badges.length > 0 && (
              <View style={styles.section}>
                <Text variant="h3" style={styles.sectionTitle}>Badges Earned</Text>
                <View style={styles.badgesRow}>
                  {hike.badges.map((badge, idx) => (
                    <View key={idx} style={styles.badge}>
                      <View style={[styles.badgeIcon, { backgroundColor: BADGE_LEVEL_COLORS[badge.level] + '33' }]}>
                        <Text style={styles.badgeEmoji}>{badge.icon}</Text>
                      </View>
                      <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Wildlife Section */}
            {hike.wildlife && hike.wildlife.length > 0 && (
              <View style={styles.section}>
                <Text variant="h3" style={styles.sectionTitle}>Wildlife Spotted</Text>
                <View style={styles.wildlifeList}>
                  {hike.wildlife.map((item, idx) => (
                    <Chip key={idx} label={`${DISCOVERY_ICONS[item.category] || '🐾'} ${item.name}`} size="sm" />
                  ))}
                </View>
              </View>
            )}

            {/* Activities Section */}
            {hike.activities && hike.activities.length > 0 && (
              <View style={styles.section}>
                <Text variant="h3" style={styles.sectionTitle}>Activities Completed</Text>
                {hike.activities.map((activity, idx) => (
                  <View key={idx} style={styles.activityItem}>
                    <Text style={styles.activityName}>{activity.name}</Text>
                    <View style={styles.xpBadge}>
                      <Text style={styles.xpText}>+{activity.xp} XP</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'discoveries' && (
          <View style={styles.tabContent}>
            {hike.discoveries && hike.discoveries.length > 0 ? (
              hike.discoveries.map((discovery, idx) => (
                <Card key={idx} style={styles.discoveryCard}>
                  {discovery.photoUri && (
                    <Image source={{ uri: discovery.photoUri }} style={styles.discoveryImage} />
                  )}
                  <View style={styles.discoveryContent}>
                    <Text variant="h3">{discovery.discoveryId}</Text>
                    {discovery.notes && (
                      <Text variant="body" color="secondary" style={styles.discoveryNotes}>
                        {discovery.notes}
                      </Text>
                    )}
                    <Text variant="caption" color="secondary">
                      {format(new Date(discovery.capturedAt), 'h:mm a')}
                    </Text>
                  </View>
                </Card>
              ))
            ) : (
              <EmptyState
                icon="camera-outline"
                title="No discoveries"
                message="You didn't capture any discoveries on this hike"
              />
            )}
          </View>
        )}

        {activeTab === 'insights' && (
          <View style={styles.tabContent}>
            {hike.insight?.status === 'completed' && hike.insight.summary ? (
              <>
                <Card style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Text style={styles.aiIcon}>✨</Text>
                    <Text variant="h3">AI Summary</Text>
                  </View>
                  <Text variant="body">{hike.insight.summary}</Text>
                </Card>

                {hike.insight.analysis && Object.entries(hike.insight.analysis).map(([key, value], idx) => (
                  <Card key={idx} style={styles.analysisCard}>
                    <Text variant="h4" style={styles.analysisTitle}>{key}</Text>
                    <Text variant="body" color="secondary">
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </Text>
                  </Card>
                ))}
              </>
            ) : hike.insight?.status === 'processing' ? (
              <Card style={styles.processingCard}>
                <LoadingState message="AI is generating insights..." variant="shimmer" />
              </Card>
            ) : (
              <EmptyState
                icon="sparkles-outline"
                title="No insights yet"
                message="Complete more hikes to receive AI-powered insights"
              />
            )}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 200,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  startMarker: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 4,
  },
  endMarker: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    padding: 4,
  },
  markerText: {
    fontSize: 16,
  },
  titleSection: {
    padding: 20,
    paddingBottom: 8,
  },
  parkName: {
    marginTop: 4,
  },
  date: {
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    margin: 4,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badge: {
    alignItems: 'center',
    width: 70,
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeName: {
    fontSize: 11,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  wildlifeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  activityName: {
    color: colors.text,
    fontWeight: '500',
  },
  xpBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  xpText: {
    color: '#D97706',
    fontWeight: 'bold',
    fontSize: 12,
  },
  discoveryCard: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  discoveryImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  discoveryContent: {
    padding: 4,
  },
  discoveryNotes: {
    marginVertical: 4,
  },
  insightCard: {
    marginBottom: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  aiIcon: {
    fontSize: 20,
  },
  analysisCard: {
    marginBottom: 12,
  },
  analysisTitle: {
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  processingCard: {
    padding: 20,
  },
});

export default HikeDetailScreen;

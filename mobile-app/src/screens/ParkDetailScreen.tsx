/**
 * Park Detail Screen
 * Shows park information and list of trails
 * NO AUTO-START - exploration only
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ApiService, { ParkDetail, Trail } from '../services/ApiService';

interface TrailCardProps {
  trail: Trail;
  onPress: () => void;
}

const TrailCard: React.FC<TrailCardProps> = ({ trail, onPress }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'moderate': return '#FF9800';
      case 'hard': return '#F44336';
      case 'expert': return '#9C27B0';
      default: return '#8E8B82';
    }
  };

  return (
    <TouchableOpacity style={styles.trailCard} onPress={onPress}>
      <View style={styles.trailHeader}>
        <Text style={styles.trailName}>{trail.name}</Text>
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor(trail.difficulty) },
          ]}
        >
          <Text style={styles.difficultyText}>{trail.difficulty.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.trailStats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{trail.length_miles.toFixed(1)}</Text>
          <Text style={styles.statLabel}>mi</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{trail.elevation_gain_ft}</Text>
          <Text style={styles.statLabel}>ft gain</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{trail.estimated_duration_hours.toFixed(1)}</Text>
          <Text style={styles.statLabel}>hrs</Text>
        </View>
      </View>

      {trail.description && (
        <Text style={styles.trailDescription} numberOfLines={2}>
          {trail.description}
        </Text>
      )}

      {trail.rating && (
        <View style={styles.rating}>
          <Text style={styles.ratingText}>⭐ {trail.rating.toFixed(1)}</Text>
          {trail.review_count && (
            <Text style={styles.reviewCount}>({trail.review_count} reviews)</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const ParkDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const parkId = (route.params as any)?.parkId;

  const [park, setPark] = useState<ParkDetail | null>(null);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'popularity' | 'length' | 'rating'>('popularity');

  useEffect(() => {
    if (parkId) {
      loadParkDetail();
    } else {
      setError('Park ID is required');
      setLoading(false);
    }
  }, [parkId]);

  const loadParkDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Defensive check: ensure parkId is provided
      if (!parkId) {
        throw new Error('Park ID is required');
      }
      
      const parkData = await ApiService.getParkDetail(parkId);
      
      // Defensive check: ensure park data is valid
      if (!parkData || !parkData.id) {
        throw new Error('Invalid park data received');
      }
      
      setPark(parkData);
      setTrails(parkData.trails || []);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load park details';
      setError(errorMessage);
      console.error('Error loading park detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedTrails = React.useMemo(() => {
    let filtered = [...trails];

    // Filter by difficulty
    if (filterDifficulty) {
      filtered = filtered.filter(t => t.difficulty === filterDifficulty);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'length':
          return a.length_miles - b.length_miles;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'popularity':
        default:
          return (b.review_count || 0) - (a.review_count || 0);
      }
    });

    return filtered;
  }, [trails, filterDifficulty, sortBy]);

  const handleTrailPress = (trail: Trail) => {
    // Defensive check: ensure trail has required fields
    if (!trail || !trail.id) {
      Alert.alert('Error', 'Invalid trail information');
      return;
    }
    
    if (!trail.park_id) {
      Alert.alert('Error', 'Trail is missing park information');
      return;
    }
    
    // Navigate to TrailDetail - NO AUTO-START
    navigation.navigate('Explore' as never, {
      screen: 'TrailDetail',
      params: { trailId: trail.id },
    } as never);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D4739" />
          <Text style={styles.loadingText}>Loading park details...</Text>
        </View>
      </View>
    );
  }

  if (error || !park) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to load park</Text>
          <Text style={styles.errorMessage}>{error || 'Park not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadParkDetail}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.parkName}>{park.name}</Text>
        <Text style={styles.parkType}>{park.type}</Text>
        <Text style={styles.parkLocation}>📍 {park.state}</Text>
      </View>

      {/* Description */}
      {park.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{park.description}</Text>
        </View>
      )}

      {/* Weather Widget Placeholder */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weather</Text>
        <View style={styles.weatherWidget}>
          <Text style={styles.weatherText}>🌤️ Current conditions unavailable</Text>
          <Text style={styles.weatherSubtext}>Weather data coming soon</Text>
        </View>
      </View>

      {/* Safety/Alerts Placeholder */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety & Alerts</Text>
        <View style={styles.alertsWidget}>
          <Text style={styles.alertsText}>✅ No current alerts</Text>
        </View>
      </View>

      {/* Trails Section */}
      <View style={styles.section}>
        <View style={styles.trailsHeader}>
          <Text style={styles.sectionTitle}>
            Trails ({filteredAndSortedTrails.length})
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                !filterDifficulty && styles.filterChipActive,
              ]}
              onPress={() => setFilterDifficulty(null)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  !filterDifficulty && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {['easy', 'moderate', 'hard', 'expert'].map((diff) => (
              <TouchableOpacity
                key={diff}
                style={[
                  styles.filterChip,
                  filterDifficulty === diff && styles.filterChipActive,
                ]}
                onPress={() => setFilterDifficulty(diff)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterDifficulty === diff && styles.filterChipTextActive,
                  ]}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sort */}
          <View style={styles.sortContainer}>
            <Text style={styles.sortLabel}>Sort:</Text>
            {(['popularity', 'length', 'rating'] as const).map((sort) => (
              <TouchableOpacity
                key={sort}
                style={[
                  styles.sortChip,
                  sortBy === sort && styles.sortChipActive,
                ]}
                onPress={() => setSortBy(sort)}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    sortBy === sort && styles.sortChipTextActive,
                  ]}
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Trail List */}
        {filteredAndSortedTrails.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🥾</Text>
            <Text style={styles.emptyTitle}>No trails found</Text>
            <Text style={styles.emptyText}>
              {filterDifficulty
                ? `No ${filterDifficulty} trails in this park`
                : 'No trails available for this park'}
            </Text>
          </View>
        ) : (
          <View style={styles.trailList}>
            {filteredAndSortedTrails.map((trail) => (
              <TrailCard
                key={trail.id}
                trail={trail}
                onPress={() => handleTrailPress(trail)}
              />
            ))}
          </View>
        )}
      </View>
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
  parkName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D4739',
    marginBottom: 4,
  },
  parkType: {
    fontSize: 16,
    color: '#8E8B82',
    marginBottom: 4,
  },
  parkLocation: {
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
  description: {
    fontSize: 16,
    color: '#2D4739',
    lineHeight: 24,
  },
  weatherWidget: {
    backgroundColor: '#F9F9F7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  weatherText: {
    fontSize: 16,
    color: '#2D4739',
    marginBottom: 4,
  },
  weatherSubtext: {
    fontSize: 14,
    color: '#8E8B82',
  },
  alertsWidget: {
    backgroundColor: '#E2E8DE',
    padding: 16,
    borderRadius: 12,
  },
  alertsText: {
    fontSize: 16,
    color: '#2D4739',
  },
  trailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filters: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9F9F7',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  filterChipActive: {
    backgroundColor: '#2D4739',
    borderColor: '#2D4739',
  },
  filterChipText: {
    fontSize: 14,
    color: '#8E8B82',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  sortLabel: {
    fontSize: 14,
    color: '#8E8B82',
    marginRight: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F9F9F7',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  sortChipActive: {
    backgroundColor: '#2D4739',
    borderColor: '#2D4739',
  },
  sortChipText: {
    fontSize: 12,
    color: '#8E8B82',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
  },
  trailList: {
    gap: 12,
  },
  trailCard: {
    backgroundColor: '#F9F9F7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  trailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trailName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D4739',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  trailStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D4739',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8B82',
  },
  trailDescription: {
    fontSize: 14,
    color: '#8E8B82',
    lineHeight: 20,
    marginBottom: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D4739',
  },
  reviewCount: {
    fontSize: 12,
    color: '#8E8B82',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D4739',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8B82',
    textAlign: 'center',
  },
});

export default ParkDetailScreen;

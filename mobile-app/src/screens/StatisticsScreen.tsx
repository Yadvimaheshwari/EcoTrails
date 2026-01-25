/**
 * Statistics Screen
 * Shows user hiking statistics and analytics
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ApiService, { HikeHistoryItem, UserStatistics } from '../services/ApiService';

const StatisticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStatistics>({
    totalHikes: 0,
    totalMiles: 0,
    totalElevation: 0,
    averagePace: 0,
  });
  const [hikeHistory, setHikeHistory] = useState<HikeHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch statistics and history in parallel
      const [statisticsData, historyData] = await Promise.all([
        ApiService.getUserStatistics('current-user-id'), // TODO: Get from auth
        ApiService.getHikeHistory('current-user-id'), // TODO: Get from auth
      ]);
      
      setStats(statisticsData);
      setHikeHistory(historyData);
    } catch (err: any) {
      console.error('Error loading statistics:', err);
      setError(err.message || 'Failed to load statistics');
      // Set zero stats on error
      setStats({
        totalHikes: 0,
        totalMiles: 0,
        totalElevation: 0,
        averagePace: 0,
      });
      setHikeHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const renderHikeItem = ({ item }: { item: HikeHistoryItem }) => (
    <TouchableOpacity
      style={styles.hikeItem}
      onPress={() => {
        // Navigate to hike detail if needed
        navigation.navigate('Activity' as never, {
          screen: 'HikeSummary',
          params: {
            sessionId: item.session_id,
            distance_miles: item.distance_miles,
            duration_minutes: item.duration_minutes,
            route_path: [],
          },
        } as never);
      }}
    >
      <View style={styles.hikeItemHeader}>
        <Text style={styles.hikeItemTrail}>{item.trail_name || 'Unknown Trail'}</Text>
        <Text style={styles.hikeItemDate}>{formatDate(item.start_time)}</Text>
      </View>
      <Text style={styles.hikeItemPark}>{item.park_name}</Text>
      <View style={styles.hikeItemStats}>
        <Text style={styles.hikeItemStat}>
          {item.distance_miles.toFixed(1)} mi
        </Text>
        <Text style={styles.hikeItemStat}>
          {formatDuration(item.duration_minutes)}
        </Text>
        {item.elevation_gain_ft && (
          <Text style={styles.hikeItemStat}>
            {item.elevation_gain_ft} ft
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D4739" />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistics</Text>
        <Text style={styles.subtitle}>Your hiking achievements</Text>
      </View>

      {stats.totalHikes === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No hikes yet</Text>
          <Text style={styles.emptyText}>
            Start recording hikes to see your statistics here
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Explore' as never, { screen: 'TrailList' } as never)}
          >
            <Text style={styles.exploreButtonText}>Explore Trails</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Summary Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalHikes}</Text>
              <Text style={styles.statLabel}>Total Hikes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalMiles.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Total Miles</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalElevation.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Elevation Gain (ft)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.averagePace.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Avg Pace (min/mi)</Text>
            </View>
          </View>

          {/* Hike History */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Hikes</Text>
            {hikeHistory.length === 0 ? (
              <View style={styles.emptyHistoryState}>
                <Text style={styles.emptyHistoryText}>
                  No hike history yet. Start recording hikes to see them here.
                </Text>
              </View>
            ) : (
              <FlatList
                data={hikeHistory}
                renderItem={renderHikeItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ListFooterComponent={<View style={{ height: 20 }} />}
              />
            )}
          </View>
        </>
      )}
      
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity onPress={loadStatistics}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2D4739',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8B82',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  exploreButton: {
    backgroundColor: '#2D4739',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  analyticsPlaceholder: {
    padding: 40,
    backgroundColor: '#F9F9F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8DE',
    alignItems: 'center',
  },
  analyticsText: {
    fontSize: 48,
    marginBottom: 8,
  },
  analyticsSubtext: {
    fontSize: 14,
    color: '#8E8B82',
  },
  hikeItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8DE',
    backgroundColor: '#FFFFFF',
  },
  hikeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hikeItemTrail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D4739',
    flex: 1,
  },
  hikeItemDate: {
    fontSize: 14,
    color: '#8E8B82',
  },
  hikeItemPark: {
    fontSize: 14,
    color: '#8E8B82',
    marginBottom: 8,
  },
  hikeItemStats: {
    flexDirection: 'row',
    gap: 16,
  },
  hikeItemStat: {
    fontSize: 14,
    color: '#2D4739',
    fontWeight: '500',
  },
  emptyHistoryState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#8E8B82',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBanner: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFC107',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#856404',
    flex: 1,
  },
  retryText: {
    fontSize: 14,
    color: '#2D4739',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default StatisticsScreen;

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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ApiService from '../services/ApiService';

const StatisticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalHikes: 0,
    totalMiles: 0,
    totalElevation: 0,
    averagePace: 0,
  });

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await ApiService.getUserStatistics();
      // setStats(response.data);
      
      // Mock data for now
      setTimeout(() => {
        setStats({
          totalHikes: 0,
          totalMiles: 0,
          totalElevation: 0,
          averagePace: 0,
        });
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error loading statistics:', error);
      setLoading(false);
    }
  };

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

          {/* Analytics Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Analytics</Text>
            <View style={styles.analyticsPlaceholder}>
              <Text style={styles.analyticsText}>📈</Text>
              <Text style={styles.analyticsSubtext}>Detailed analytics coming soon</Text>
            </View>
          </View>
        </>
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
});

export default StatisticsScreen;

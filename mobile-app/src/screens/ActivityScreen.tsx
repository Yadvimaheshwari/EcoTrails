/**
 * Activity Screen
 * View past hikes, statistics, and achievements
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

interface HikeSession {
  id: string;
  trail_id?: string;
  park_name: string;
  start_time: string;
  end_time?: string;
  status: string;
  distance_miles?: number;
  duration_minutes?: number;
}

const ActivityScreen: React.FC = () => {
  const navigation = useNavigation();
  const [hikes, setHikes] = useState<HikeSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHikes();
  }, []);

  const loadHikes = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual user ID
      const userId = 'current-user-id';
      const response = await axios.get(`${API_BASE_URL}/api/v1/users/${userId}/hikes`);
      setHikes(response.data || []);
    } catch (error) {
      console.error('Error loading hikes:', error);
      // For now, use empty array
      setHikes([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleHikePress = (hike: HikeSession) => {
    navigation.navigate('HikeDetail' as never, { hikeId: hike.id } as never);
  };

  const renderHikeItem = ({ item }: { item: HikeSession }) => (
    <TouchableOpacity
      style={styles.hikeCard}
      onPress={() => handleHikePress(item)}
    >
      <View style={styles.hikeHeader}>
        <Text style={styles.hikePark}>{item.park_name}</Text>
        <Text style={styles.hikeDate}>{formatDate(item.start_time)}</Text>
      </View>
      
      <View style={styles.hikeStats}>
        {item.distance_miles && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.distance_miles.toFixed(1)}</Text>
            <Text style={styles.statLabel}>miles</Text>
          </View>
        )}
        {item.duration_minutes && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDuration(item.duration_minutes)}</Text>
            <Text style={styles.statLabel}>duration</Text>
          </View>
        )}
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.status}</Text>
          <Text style={styles.statLabel}>status</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Activity</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D4739" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.subtitle}>Your hiking history</Text>
      </View>

      {hikes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📔</Text>
          <Text style={styles.emptyTitle}>No hikes yet</Text>
          <Text style={styles.emptyText}>
            Start recording your first hike from the Record Hike tab
          </Text>
        </View>
      ) : (
        <FlatList
          data={hikes}
          renderItem={renderHikeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 20,
  },
  hikeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  hikeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hikePark: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D4739',
    flex: 1,
  },
  hikeDate: {
    fontSize: 14,
    color: '#8E8B82',
  },
  hikeStats: {
    flexDirection: 'row',
    gap: 24,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
    lineHeight: 24,
  },
});

export default ActivityScreen;

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { IntelligentJournal } from '../components/IntelligentJournal';
import { api } from '../config/api';
import { useAuthStore } from '../store/useAuthStore';

export const JournalScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const [hikes, setHikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHikes();
  }, []);

  const loadHikes = async () => {
    if (!user) {
      setLoading(false);
      setHikes([]);
      return;
    }

    try {
      const response = await api.get('/api/v1/hikes', {
        params: { status: 'completed', limit: 50 },
      });
      setHikes(response.data.hikes || []);
    } catch (error: any) {
      console.error('Error loading hikes:', error);
      if (error.response?.status === 401 || error.response?.status === 404) {
        console.log('Authentication required or endpoint not available');
      }
      setHikes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleHikePress = (hike: any) => {
    // Navigate to the comprehensive hike detail screen
    navigation.navigate('HikeDetail', { hikeId: hike.id });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h2">Journal</Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          Your hiking timeline
        </Text>
      </View>

      <FlatList
        data={hikes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <TouchableOpacity 
            onPress={() => handleHikePress(item)}
            style={{ opacity: 1 - (index * 0.05) }}
          >
            <Card style={styles.hikeCard}>
              <Text variant="h3" numberOfLines={1}>
                {item.name || item.trail?.name || 'Unnamed Hike'}
              </Text>
              <Text variant="caption" color="secondary" style={styles.date}>
                {item.start_time ? format(new Date(item.start_time), 'MMM d, yyyy') : 'Date unknown'}
              </Text>
              {item.distance_miles && (
                <Text variant="body" color="secondary" style={styles.distance}>
                  {item.distance_miles.toFixed(2)} miles
                </Text>
              )}
              {item.elevation_gain_feet && (
                <Text variant="caption" color="secondary">
                  +{Math.round(item.elevation_gain_feet)} ft
                </Text>
              )}
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="book-outline"
            title="Your journal is waiting"
            message="Start your first hike to begin your story"
          />
        }
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
    padding: 20,
    paddingBottom: 8,
  },
  subtitle: {
    marginTop: 8,
  },
  list: {
    padding: 20,
    paddingTop: 8,
  },
  hikeCard: {
    marginBottom: 12,
  },
  date: {
    marginTop: 4,
  },
  distance: {
    marginTop: 8,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
});

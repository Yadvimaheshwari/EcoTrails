import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { api, getJournalEntries } from '../config/api';
import { useAuthStore } from '../store/useAuthStore';
import type { JournalEntry } from '../types/journal';

export const JournalScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const [hikes, setHikes] = useState<any[]>([]);
  const [tripPlans, setTripPlans] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    await Promise.all([loadHikes(), loadTripPlans()]);
  };

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

  const loadTripPlans = async () => {
    if (!user) {
      setTripPlans([]);
      return;
    }
    try {
      const res = await getJournalEntries({ entryType: 'trip_plan', limit: 50 });
      setTripPlans((res.data?.entries || []) as JournalEntry[]);
    } catch (e) {
      console.warn('[Journal] Could not load trip plans:', e);
      setTripPlans([]);
    }
  };

  const handleHikePress = (hike: any) => {
    // Navigate to the comprehensive hike detail screen
    navigation.navigate('HikeDetail', { hikeId: hike.id });
  };

  const nextTripCards = useMemo(() => {
    return tripPlans
      .map((entry) => {
        const meta = (entry.meta_data || entry.metadata || {}) as any;
        return {
          id: entry.id,
          placeName: meta.place_name || meta.placeName || entry.title || 'Trip Plan',
          visitDate: meta.visit_date || meta.visitDate,
        };
      })
      .slice(0, 3);
  }, [tripPlans]);

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
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Card style={styles.tripCard}>
              <Text variant="caption" color="secondary" style={{ letterSpacing: 0.8 }}>
                NEXT UP
              </Text>
              <Text variant="h3" style={{ marginTop: 8 }}>
                NextTrip
              </Text>
              <Text variant="caption" color="secondary" style={{ marginTop: 6 }}>
                Plan your next trip and keep your checklist here.
              </Text>
              <Button
                title="Plan your next trip"
                onPress={() => navigation.navigate('TripPlanner')}
                style={{ marginTop: 12 }}
              />
              {nextTripCards.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text variant="label" color="secondary" style={{ marginBottom: 8 }}>
                    Upcoming
                  </Text>
                  {nextTripCards.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => navigation.navigate('TripPlanDetail', { entryId: t.id })}
                      activeOpacity={0.75}
                    >
                      <View style={styles.tripRow}>
                        <View style={{ flex: 1 }}>
                          <Text variant="body" numberOfLines={1} style={{ fontWeight: '600' as any }}>
                            {t.placeName}
                          </Text>
                          <Text variant="caption" color="secondary">
                            {t.visitDate ? `Visit date: ${t.visitDate}` : 'Visit date: not set'}
                          </Text>
                        </View>
                        <Text variant="caption" color="accent">
                          Open →
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    onPress={() => navigation.navigate('TripPlans')}
                    style={{ marginTop: 10 }}
                    activeOpacity={0.75}
                  >
                    <Text variant="caption" color="accent">
                      View all trip plans
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          </View>
        }
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
  tripCard: {
    marginBottom: 12,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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

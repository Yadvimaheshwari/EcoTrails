import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getJournalEntries } from '../config/api';
import type { JournalEntry } from '../types/journal';

type TripPlanCard = {
  id: string;
  title: string;
  placeName: string;
  visitDate?: string;
};

function extractTripPlanCard(entry: JournalEntry): TripPlanCard {
  const meta = (entry.meta_data || entry.metadata || {}) as any;
  const placeName = meta.place_name || meta.placeName || 'Unknown place';
  const visitDate = meta.visit_date || meta.visitDate;
  return {
    id: entry.id,
    title: entry.title || `Trip Plan: ${placeName}`,
    placeName,
    visitDate,
  };
}

export const TripPlansScreen: React.FC = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cards = useMemo(() => entries.map(extractTripPlanCard), [entries]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getJournalEntries({ entryType: 'trip_plan', limit: 200 });
      setEntries((res.data?.entries || []) as JournalEntry[]);
    } catch (e: any) {
      console.error('[TripPlans] load failed:', e);
      setEntries([]);
      setError(e?.response?.data?.detail || e?.message || 'Failed to load trip plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text variant="h2">Next trips</Text>
          <Text variant="caption" color="secondary">
            Your saved trip plans
          </Text>
        </View>
        <TouchableOpacity onPress={load} style={styles.headerBtn} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Ionicons name="refresh" size={20} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Button title="Plan your next trip" onPress={() => navigation.navigate('TripPlanner')} />

        {error && (
          <Text variant="caption" style={{ color: colors.error, marginTop: 10 }}>
            {error}
          </Text>
        )}

        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('TripPlanDetail', { entryId: item.id })} activeOpacity={0.75}>
              <Card style={styles.card}>
                <Text variant="h3" numberOfLines={1}>
                  {item.placeName}
                </Text>
                <Text variant="caption" color="secondary" style={{ marginTop: 6 }}>
                  {item.visitDate ? `Visit date: ${item.visitDate}` : 'Visit date: not set'}
                </Text>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ paddingTop: 18 }}>
              <Text variant="body" color="secondary">
                No trip plans yet.
              </Text>
              <Text variant="caption" color="secondary" style={{ marginTop: 6 }}>
                Tap “Plan your next trip” to generate your first checklist.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: { flex: 1, paddingHorizontal: 20 },
  card: { marginBottom: 12 },
});


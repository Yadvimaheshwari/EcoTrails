import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { planTrip, searchPlaces } from '../config/api';

type PlaceResult = {
  id: string;
  name: string;
  place_type?: string;
  location?: { lat: number; lng: number };
};

function formatDateISO(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const TripPlannerScreen: React.FC = ({ navigation }: any) => {
  const [query, setQuery] = useState('');
  const [visitDate, setVisitDate] = useState(formatDateISO(new Date()));
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [selected, setSelected] = useState<PlaceResult | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPlan = useMemo(() => !!selected && !!visitDate, [selected, visitDate]);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setError(null);
    setLoadingSearch(true);
    setSelected(null);
    try {
      const res = await searchPlaces(q, 20);
      setResults((res.data?.places || []) as PlaceResult[]);
    } catch (e: any) {
      console.error('[TripPlanner] search failed:', e);
      setResults([]);
      setError(e?.response?.data?.detail || e?.message || 'Search failed');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handlePlanTrip = async () => {
    if (!selected) return;
    const date = visitDate.trim();
    if (!date) return;

    setPlanning(true);
    setError(null);
    try {
      const res = await planTrip(selected.id, date);
      const entryId = res.data?.journal_entry_id;
      if (entryId) {
        navigation.replace('TripPlanDetail', { entryId });
      } else {
        // Fallback: go to trip plans list
        navigation.navigate('TripPlans');
      }
    } catch (e: any) {
      console.error('[TripPlanner] plan failed:', e);
      setError(e?.response?.data?.detail || e?.message || 'Failed to generate trip plan');
    } finally {
      setPlanning(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text variant="h3">Plan your next trip</Text>
          <Text variant="caption" color="secondary">
            Search a park/place, pick a date, and generate a checklist
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Card style={styles.formCard}>
          <Text variant="label" color="secondary" style={styles.label}>
            Where are you going?
          </Text>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search places (e.g., Yosemite)"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity onPress={handleSearch} style={styles.searchBtn} disabled={loadingSearch}>
              {loadingSearch ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Ionicons name="search" size={18} color={colors.surface} />
              )}
            </TouchableOpacity>
          </View>

          <Text variant="label" color="secondary" style={styles.labelTop}>
            Visit date (YYYY-MM-DD)
          </Text>
          <TextInput
            value={visitDate}
            onChangeText={setVisitDate}
            placeholder="2026-02-07"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            autoCapitalize="none"
          />

          {error && (
            <Text variant="caption" style={styles.errorText}>
              {error}
            </Text>
          )}

          <Button
            title={planning ? 'Generating…' : 'Generate Trip Plan'}
            onPress={handlePlanTrip}
            disabled={!canPlan || planning}
            loading={planning}
            style={{ marginTop: 14 }}
          />
        </Card>

        <View style={styles.resultsHeader}>
          <Text variant="h3">Results</Text>
          <Text variant="caption" color="secondary">
            Tap one to select
          </Text>
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const isSelected = selected?.id === item.id;
            return (
              <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.75}>
                <Card style={isSelected ? styles.resultCardSelected : styles.resultCard}>
                  <View style={styles.resultRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" numberOfLines={1} style={styles.resultTitle}>
                        {item.name}
                      </Text>
                      <Text variant="caption" color="secondary" numberOfLines={1}>
                        {item.place_type || 'Place'}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingTop: 8 }}>
              <Text variant="caption" color="secondary">
                Search for a place to see results.
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
  formCard: { marginBottom: 16 },
  label: { marginBottom: 6 },
  labelTop: { marginBottom: 6, marginTop: 12 },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  errorText: { color: colors.error, marginTop: 10 },
  resultsHeader: { marginBottom: 8 },
  resultCard: { marginBottom: 10 },
  resultCardSelected: {
    marginBottom: 10,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultTitle: { fontWeight: '600' as any },
});


import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { getJournalEntries, updateJournalEntryMetadata } from '../config/api';
import type { JournalEntry } from '../types/journal';

type ChecklistSection = { key: string; title: string; items: string[] };

function titleize(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export const TripPlanDetailScreen: React.FC = ({ route, navigation }: any) => {
  const { entryId } = route.params as { entryId: string };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const meta = useMemo(() => ((entry?.meta_data || entry?.metadata || {}) as any) || {}, [entry]);
  const tripPlanData = useMemo(() => (meta.trip_plan_data || {}) as any, [meta]);
  const plan = useMemo(() => (tripPlanData.plan || {}) as any, [tripPlanData]);

  const checklistSections: ChecklistSection[] = useMemo(() => {
    const checklist = (plan.checklist || {}) as Record<string, string[]>;
    return Object.keys(checklist).map((k) => ({
      key: k,
      title: titleize(k),
      items: Array.isArray(checklist[k]) ? checklist[k] : [],
    }));
  }, [plan]);

  const placeName = meta.place_name || meta.placeName || (tripPlanData.place_name as string) || 'Trip Plan';
  const visitDate = meta.visit_date || meta.visitDate || tripPlanData.visit_date;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getJournalEntries({ entryType: 'trip_plan', limit: 200 });
      const entries = (res.data?.entries || []) as JournalEntry[];
      const found = entries.find((e) => e.id === entryId) || null;
      setEntry(found);

      const foundMeta = (found?.meta_data || found?.metadata || {}) as any;
      const tp = (foundMeta.trip_plan_data || {}) as any;
      const done = (tp.completed_checklist_items || []) as string[];
      setCompleted(new Set(done));
    } catch (e: any) {
      console.error('[TripPlanDetail] load failed:', e);
      setError(e?.response?.data?.detail || e?.message || 'Failed to load trip plan');
      setEntry(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [entryId]);

  const toggleItem = async (category: string, item: string) => {
    if (!entry) return;

    const id = `${category}::${item}`;
    const next = new Set(completed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCompleted(next);

    // Persist in metadata under trip_plan_data.completed_checklist_items (same shape as web).
    const nextMeta = {
      ...(entry.meta_data || entry.metadata || {}),
      trip_plan_data: {
        ...(tripPlanData || {}),
        completed_checklist_items: Array.from(next),
      },
    };

    setSaving(true);
    setError(null);
    try {
      await updateJournalEntryMetadata(entry.id, nextMeta);
    } catch (e: any) {
      console.error('[TripPlanDetail] save failed:', e);
      setError(e?.response?.data?.detail || e?.message || 'Failed to save checklist');
      // Roll back UI if save fails
      setCompleted(new Set(completed));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="caption" color="secondary" style={{ marginTop: 10 }}>
            Loading trip plan…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text variant="h3">Trip plan</Text>
            <Text variant="caption" color="secondary">
              Not found
            </Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <Text variant="body" color="secondary">
            This trip plan could not be loaded.
          </Text>
          {error && (
            <Text variant="caption" style={{ color: colors.error, marginTop: 10 }}>
              {error}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text variant="h3" numberOfLines={1}>
            {placeName}
          </Text>
          <Text variant="caption" color="secondary">
            {visitDate ? `Visit date: ${visitDate}` : 'Visit date: not set'}
          </Text>
        </View>
        <View style={styles.savePill}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="cloud-done-outline" size={18} color={colors.textSecondary} />
          )}
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
        {error && (
          <Card style={{ marginBottom: 12 }}>
            <Text variant="caption" style={{ color: colors.error }}>
              {error}
            </Text>
          </Card>
        )}

        <Card style={{ marginBottom: 12 }}>
          <Text variant="h3">Pre-trip checklist</Text>
          <Text variant="caption" color="secondary" style={{ marginTop: 6 }}>
            Tap items to mark done. Your progress is saved.
          </Text>
        </Card>

        {checklistSections.length === 0 ? (
          <Card>
            <Text variant="body" color="secondary">
              No checklist found for this plan.
            </Text>
          </Card>
        ) : (
          checklistSections.map((section) => (
            <Card key={section.key} style={{ marginBottom: 12 }}>
              <Text variant="h3" style={{ marginBottom: 10 }}>
                {section.title}
              </Text>
              {section.items.map((item) => {
                const id = `${section.key}::${item}`;
                const isDone = completed.has(id);
                const textStyle = isDone
                  ? ({ flex: 1, color: colors.textSecondary, textDecorationLine: 'line-through' } as any)
                  : ({ flex: 1 } as any);
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => toggleItem(section.key, item)}
                    style={styles.checkRow}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isDone ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isDone ? colors.primary : colors.textTertiary}
                    />
                    <Text variant="body" style={textStyle}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  savePill: {
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
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});


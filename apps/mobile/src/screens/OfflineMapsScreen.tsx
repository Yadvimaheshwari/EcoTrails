import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { deleteOfflinePdfMap, listOfflinePdfMaps, openOfflinePdf, type OfflinePdfRecord } from '../services/offlinePdfMaps';

export const OfflineMapsScreen: React.FC = ({ navigation }: any) => {
  const [items, setItems] = useState<OfflinePdfRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listOfflinePdfMaps();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, []);

  const handleDelete = async (placeId: string) => {
    Alert.alert('Remove offline map?', 'This will delete the downloaded PDF from your device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteOfflinePdfMap(placeId);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text variant="h3" style={styles.headerTitle}>
          Offline maps
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text variant="body" color="secondary">
            Loading…
          </Text>
        ) : items.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <EmptyState
              icon="map-outline"
              title="No offline maps yet"
              message="Download an offline map from a park page to view it here."
            />
            <View style={{ marginTop: 16, width: '100%' }}>
              <Button title="Explore parks" onPress={() => navigation.navigate('Explore')} variant="outline" />
            </View>
          </View>
        ) : (
          items.map((it) => (
            <Card key={it.placeId} style={styles.card}>
              <Text variant="h3" numberOfLines={2}>
                {it.parkName || it.placeId}
              </Text>
              <Text variant="caption" color="secondary" style={{ marginTop: 6 }}>
                {(it.bytes / 1024 / 1024).toFixed(1)} MB • Downloaded {new Date(it.downloadedAt).toLocaleDateString()}
              </Text>
              <View style={styles.actionsRow}>
                <Button title="Open" onPress={() => openOfflinePdf(it.localUri)} variant="outline" />
                <Button title="Delete" onPress={() => handleDelete(it.placeId)} variant="ghost" />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 24 },
  card: { marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
});


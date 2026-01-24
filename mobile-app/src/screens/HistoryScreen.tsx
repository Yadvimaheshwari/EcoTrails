/**
 * History Screen
 * Shows past hikes and environmental records
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:8000';

interface EnvironmentalRecord {
  id: string;
  park_name: string;
  timestamp: string;
  summary: string;
  tags: string[];
  multimodal_evidence: string[];
}

const HistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [records, setRecords] = useState<EnvironmentalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      // Try to load from local storage first
      const saved = await AsyncStorage.getItem('atlas_records_v2');
      if (saved) {
        setRecords(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRecord = (record: EnvironmentalRecord) => {
    navigation.navigate('PostHike', { record });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading history...</Text>
      </View>
    );
  }

  if (records.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>📔</Text>
        <Text style={styles.emptyTitle}>No hikes yet</Text>
        <Text style={styles.emptyText}>
          Start your first hike to begin building your environmental memory
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Hikes</Text>
        <Text style={styles.subtitle}>{records.length} memories</Text>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.recordCard}
            onPress={() => handleOpenRecord(item)}
          >
            {item.multimodal_evidence && item.multimodal_evidence[0] && (
              <Image
                source={{ uri: item.multimodal_evidence[0] }}
                style={styles.recordImage}
              />
            )}
            <View style={styles.recordContent}>
              <Text style={styles.recordPark}>{item.park_name}</Text>
              <Text style={styles.recordDate}>
                {new Date(item.timestamp).toLocaleDateString()}
              </Text>
              <Text style={styles.recordSummary} numberOfLines={2}>
                {item.summary}
              </Text>
              {item.tags && item.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {item.tags.slice(0, 3).map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 20,
    paddingTop: 60,
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
  listContent: {
    padding: 20,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  recordImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E2E8DE',
  },
  recordContent: {
    padding: 16,
  },
  recordPark: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D4739',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 14,
    color: '#8E8B82',
    marginBottom: 8,
  },
  recordSummary: {
    fontSize: 16,
    color: '#4A443F',
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E2E8DE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#2D4739',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D4739',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8B82',
    textAlign: 'center',
    maxWidth: 300,
  },
});

export default HistoryScreen;

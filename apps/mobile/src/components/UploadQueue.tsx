import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from './ui/Text';
import { Card } from './ui/Card';
import { dbService } from '../services/offlineQueue';
import { syncMediaQueue } from '../services/mediaSync';

interface QueuedMedia {
  id: number;
  hikeId: string;
  uri: string;
  type: string;
  synced: number;
  createdAt: string;
}

export const UploadQueue: React.FC = () => {
  const [queuedItems, setQueuedItems] = useState<QueuedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<number, number>>({});

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const pending = await dbService.getPendingMedia();
      setQueuedItems(pending);
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  };

  const handleRetry = async (item: QueuedMedia) => {
    setUploading(true);
    try {
      await syncMediaQueue([item], (itemId, progressValue) => {
        setProgress((prev) => ({ ...prev, [itemId]: progressValue }));
      });
      await loadQueue();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setUploading(false);
      setProgress({});
    }
  };

  const handleRetryAll = async () => {
    setUploading(true);
    try {
      await syncMediaQueue(queuedItems, (itemId, progressValue) => {
        setProgress((prev) => ({ ...prev, [itemId]: progressValue }));
      });
      await loadQueue();
    } catch (error) {
      console.error('Retry all failed:', error);
    } finally {
      setUploading(false);
      setProgress({});
    }
  };

  if (queuedItems.length === 0) {
    return null;
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text variant="h3">Upload Queue</Text>
        {queuedItems.length > 1 && (
          <TouchableOpacity onPress={handleRetryAll} disabled={uploading}>
            <Text variant="body" color="accent">Retry All</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={queuedItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemInfo}>
              <Ionicons
                name={item.type === 'photo' ? 'image' : item.type === 'video' ? 'videocam' : 'musical-notes'}
                size={24}
                color={colors.textSecondary}
              />
              <View style={styles.itemDetails}>
                <Text variant="body" numberOfLines={1}>
                  {item.type} • {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                {progress[item.id] !== undefined && (
                  <View style={styles.progressBar}>
                    <View
                      style={[styles.progressFill, { width: `${progress[item.id]}%` }]}
                    />
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => handleRetry(item)}
              disabled={uploading || progress[item.id] !== undefined}
            >
              <Ionicons
                name="refresh"
                size={20}
                color={uploading ? colors.textTertiary : colors.primary}
              />
            </TouchableOpacity>
          </View>
        )}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 20,
    marginTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemDetails: {
    marginLeft: 12,
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { useHikeStore } from '../store/useHikeStore';
import { detectMediaDuringHike, addDetectedMediaToQueue, DetectedMedia } from '../services/mediaDetection';

export const MediaPickerScreen: React.FC = ({ navigation }: any) => {
  const { currentHike } = useHikeStore();
  const [detectedMedia, setDetectedMedia] = useState<DetectedMedia[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetectedMedia();
  }, []);

  const loadDetectedMedia = async () => {
    if (!currentHike.startTimeMs) return;

    try {
      const endTime = new Date();
      const media = await detectMediaDuringHike(new Date(currentHike.startTimeMs), endTime);
      setDetectedMedia(media);
    } catch (error) {
      console.error('Failed to detect media:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (uri: string) => {
    const newSelected = new Set(selectedMedia);
    if (newSelected.has(uri)) {
      newSelected.delete(uri);
    } else {
      newSelected.add(uri);
    }
    setSelectedMedia(newSelected);
  };

  const handleAddSelected = async () => {
    if (selectedMedia.size === 0 || !currentHike.id) return;

    const toAdd = detectedMedia.filter((m) => selectedMedia.has(m.uri));
    await addDetectedMediaToQueue(currentHike.id, toAdd);

    navigation.goBack();
  };

  const handleSkip = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text>Scanning for moments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (detectedMedia.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text variant="h2">No moments found</Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            We didn't find any photos or videos taken during your hike
          </Text>
        </View>
        <View style={styles.footer}>
          <Button title="Continue" onPress={handleSkip} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h2">We found moments from your walk</Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          Select photos and videos to add to your hike
        </Text>
      </View>

      <FlatList
        data={detectedMedia}
        numColumns={3}
        keyExtractor={(item) => item.uri}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => {
          const isSelected = selectedMedia.has(item.uri);
          return (
            <TouchableOpacity
              style={[styles.mediaItem, isSelected && styles.mediaItemSelected]}
              onPress={() => toggleSelection(item.uri)}
            >
              {item.type === 'photo' ? (
                <Image source={{ uri: item.uri }} style={styles.mediaImage} />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Ionicons name="videocam" size={32} color={colors.textTertiary} />
                </View>
              )}
              {isSelected && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <Button
          title={`Add ${selectedMedia.size} ${selectedMedia.size === 1 ? 'moment' : 'moments'}`}
          onPress={handleAddSelected}
          disabled={selectedMedia.size === 0}
        />
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text variant="body" color="secondary">Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  subtitle: {
    marginTop: 8,
  },
  grid: {
    padding: 20,
  },
  mediaItem: {
    width: '31%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mediaItemSelected: {
    borderColor: colors.primary,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  footer: {
    padding: 20,
    paddingTop: 12,
  },
  skipButton: {
    alignItems: 'center',
    padding: 16,
  },
});

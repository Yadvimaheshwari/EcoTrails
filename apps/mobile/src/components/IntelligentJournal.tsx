import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Text } from './ui/Text';
import { Card } from './ui/Card';
import { api } from '../config/api';
import { colors } from '../config/colors';

interface IntelligentJournalProps {
  hikeId: string;
  hike: any;
}

export const IntelligentJournal: React.FC<IntelligentJournalProps> = ({ hikeId, hike }) => {
  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);

  const loadStory = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/api/v1/hikes/${hikeId}/generate-story`, {
        style: 'narrative'
      });
      setStory(response.data);
    } catch (error) {
      console.error('Failed to load story:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    setGeneratingVideo(true);
    try {
      const response = await api.post(`/api/v1/hikes/${hikeId}/generate-video`, {
        style: 'cinematic',
        duration: 60,
        include_narration: true,
      });
      console.log('Video generated:', response.data);
    } catch (error) {
      console.error('Video generation failed:', error);
    } finally {
      setGeneratingVideo(false);
    }
  };

  useEffect(() => {
    if (hikeId) {
      loadStory();
    }
  }, [hikeId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="body" color="secondary" style={styles.loadingText}>
          Generating AI story...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {story && (
        <Card style={styles.storyCard}>
          <View style={styles.header}>
            <Text variant="h3">AI-Generated Story</Text>
          </View>
          
          <Text variant="body" style={styles.storyText}>
            {story.story}
          </Text>

          {story.highlights && story.highlights.length > 0 && (
            <View style={styles.highlightsContainer}>
              <Text variant="h4" style={styles.sectionTitle}>Key Highlights</Text>
              {story.highlights.map((highlight: string, idx: number) => (
                <View key={idx} style={styles.highlightItem}>
                  <Text style={styles.bullet}>⭐</Text>
                  <Text variant="body" style={styles.highlightText}>{highlight}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}

      <Card style={styles.actionsCard}>
        <Text variant="h4" style={styles.sectionTitle}>AI Enhancements</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleGenerateVideo}
          disabled={generatingVideo}
        >
          <Text style={styles.actionIcon}>🎬</Text>
          <View style={styles.actionContent}>
            <Text variant="body" style={styles.actionTitle}>Generate Trail Video</Text>
            <Text variant="caption" color="secondary">
              {generatingVideo ? 'Generating...' : 'Create cinematic recap video'}
            </Text>
          </View>
          {generatingVideo && <ActivityIndicator size="small" color={colors.primary} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={loadStory}
          disabled={loading}
        >
          <Text style={styles.actionIcon}>✨</Text>
          <View style={styles.actionContent}>
            <Text variant="body" style={styles.actionTitle}>Regenerate Story</Text>
            <Text variant="caption" color="secondary">Refresh AI analysis</Text>
          </View>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  storyCard: {
    margin: 16,
    marginBottom: 8,
  },
  header: {
    marginBottom: 16,
  },
  storyText: {
    lineHeight: 24,
    marginBottom: 16,
  },
  highlightsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  highlightItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    marginRight: 8,
    marginTop: 2,
  },
  highlightText: {
    flex: 1,
  },
  actionsCard: {
    margin: 16,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    marginBottom: 4,
  },
});

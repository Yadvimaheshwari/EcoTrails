/**
 * Post-Hike Insights Screen
 * Shows comprehensive environmental analysis after hike completion
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const PostHikeInsightsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { sessionId, record } = route.params as any;

  const [loading, setLoading] = useState(!record);
  const [insights, setInsights] = useState<any>(record || null);

  useEffect(() => {
    if (!record && sessionId) {
      loadInsights();
    }
  }, [sessionId]);

  const loadInsights = async () => {
    try {
      // Fetch environmental record for session
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/sessions/${sessionId}/record`
      );
      setInsights(response.data);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2D4739" />
        <Text style={styles.loadingText}>Generating your field note...</Text>
      </View>
    );
  }

  if (!insights) {
    return (
      <View style={styles.centerContainer}>
        <Text>No insights available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Hero Image */}
      {insights.multimodal_evidence && insights.multimodal_evidence[0] && (
        <Image
          source={{ uri: insights.multimodal_evidence[0] }}
          style={styles.heroImage}
        />
      )}

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.parkName}>{insights.park_name}</Text>
          <Text style={styles.date}>
            {new Date(insights.timestamp).toLocaleDateString()}
          </Text>
        </View>

        {/* Field Narrative */}
        {insights.field_narrative && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Field Narrative</Text>
            <View style={styles.narrativeCard}>
              <Text style={styles.narrativeLabel}>Consistent</Text>
              <Text style={styles.narrativeText}>
                {insights.field_narrative.consistent}
              </Text>
            </View>
            <View style={styles.narrativeCard}>
              <Text style={styles.narrativeLabel}>Changes Noticed</Text>
              <Text style={styles.narrativeText}>
                {insights.field_narrative.different}
              </Text>
            </View>
            <View style={styles.narrativeCard}>
              <Text style={styles.narrativeLabel}>Evolution</Text>
              <Text style={styles.narrativeText}>
                {insights.field_narrative.changing}
              </Text>
            </View>
          </View>
        )}

        {/* Temporal Comparison */}
        {insights.temporal_delta && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historical Comparison</Text>
            <View style={styles.card}>
              <Text style={styles.cardText}>{insights.temporal_delta}</Text>
            </View>
          </View>
        )}

        {/* Tags */}
        {insights.tags && insights.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observations</Text>
            <View style={styles.tagsContainer}>
              {insights.tags.map((tag: string, index: number) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
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
  },
  heroImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#E2E8DE',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  parkName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D4739',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: '#8E8B82',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D4739',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  narrativeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  narrativeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8B82',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  narrativeText: {
    fontSize: 16,
    color: '#2D4739',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  cardText: {
    fontSize: 16,
    color: '#2D4739',
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E2E8DE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: '#2D4739',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8B82',
  },
});

export default PostHikeInsightsScreen;

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { LoadingState } from '../components/ui/LoadingState';
import { api } from '../config/api';

export const PostHikeReportScreen: React.FC = ({ route, navigation }: any) => {
  const { hikeId } = route.params;
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsight();
    const interval = setInterval(() => {
      checkInsightStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [hikeId]);

  const loadInsight = async () => {
    try {
      const response = await api.get(`/api/v1/hikes/${hikeId}/insights/status`);
      const insightData = response.data.insight;
      setInsight(insightData);

      if (insightData?.status === 'completed') {
        const reportResponse = await api.get(`/api/v1/hikes/${hikeId}/insights`);
        setInsight(reportResponse.data.insight);
      }
    } catch (error) {
      console.error('Failed to load insight:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkInsightStatus = async () => {
    if (insight?.status === 'processing') {
      try {
        const response = await api.get(`/api/v1/hikes/${hikeId}/insights/status`);
        if (response.data.insight.status === 'completed') {
          loadInsight();
        }
      } catch (error) {
        console.error('Failed to check status:', error);
      }
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my hike on EcoTrails! ${insight?.summary || ''}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  if (loading || !insight) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingState
          message="Preparing your insights..."
          variant={insight?.status === 'processing' ? 'shimmer' : 'default'}
        />
      </SafeAreaView>
    );
  }

  const cards = insight.analysis ? Object.entries(insight.analysis).slice(0, 6) : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.summarySection}>
          <Text variant="h2" style={styles.title}>Hike Report</Text>
          {insight.summary && (
            <Card style={styles.summaryCard}>
              <Text variant="body">{insight.summary}</Text>
            </Card>
          )}

          {insight.confidence && (
            <Chip
              label={`Confidence: ${insight.confidence}`}
              variant={insight.confidence === 'High' ? 'success' : insight.confidence === 'Medium' ? 'accent' : 'default'}
              size="sm"
            />
          )}
        </View>

        <View style={styles.cardsSection}>
          {cards.map(([key, value]: [string, any], index) => (
            <Card key={index} style={styles.insightCard}>
              <Text variant="h3" style={styles.cardTitle}>{key}</Text>
              <Text variant="body" color="secondary">
                {typeof value === 'string' ? value : JSON.stringify(value)}
              </Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 0,
  },
  content: {
    flex: 1,
  },
  summarySection: {
    padding: 20,
    paddingTop: 8,
  },
  title: {
    marginBottom: 16,
  },
  summaryCard: {
    marginBottom: 12,
  },
  confidenceTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  confidenceText: {
    color: colors.primaryDark,
    fontFamily: 'Inter_500Medium',
  },
  cardsSection: {
    padding: 20,
    paddingTop: 0,
    gap: 16,
  },
  insightCard: {
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 8,
  },
});

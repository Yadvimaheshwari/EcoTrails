/**
 * Checkpoint Card Component (Mobile)
 * Displays checkpoint details and activities for React Native
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ActivityModal } from './ActivityModal';

export interface CheckpointActivity {
  id: string;
  type: 'observation' | 'photo_challenge' | 'trivia' | 'scavenger_hunt' | 'audio_listen' | 'mindfulness' | 'exploration';
  title: string;
  description: string;
  xp: number;
  prompt: string;
  completion_criteria: any;
  estimated_minutes?: number;
  educational_note?: string;
}

export interface TrailCheckpoint {
  id: string;
  name: string;
  description: string;
  sequence: number;
  location: { lat: number; lng: number };
  distance_from_start_meters: number;
  elevation_feet?: number;
  activities: CheckpointActivity[];
  photo_url?: string;
}

export interface CheckpointProgress {
  checkpoint_id: string;
  activities_completed: string[];
  xp_earned: number;
  reached_at?: string;
}

interface CheckpointCardProps {
  checkpoint: TrailCheckpoint;
  isNearby: boolean;
  progress: CheckpointProgress;
  onActivityComplete: (activityId: string, proof: any) => Promise<void>;
}

const ACTIVITY_ICONS: Record<string, string> = {
  observation: '👁️',
  photo_challenge: '📸',
  trivia: '🧠',
  scavenger_hunt: '🔍',
  audio_listen: '👂',
  mindfulness: '🧘',
  exploration: '🗺️',
};

function getActivityIcon(type: string): string {
  return ACTIVITY_ICONS[type] || '✨';
}

export function CheckpointCard({ checkpoint, isNearby, progress, onActivityComplete }: CheckpointCardProps) {
  const [selectedActivity, setSelectedActivity] = useState<CheckpointActivity | null>(null);
  const [completing, setCompleting] = useState(false);

  const handleCompleteActivity = async (proof: any) => {
    if (!selectedActivity) return;
    
    setCompleting(true);
    try {
      await onActivityComplete(selectedActivity.id, proof);
      setSelectedActivity(null);
    } catch (err) {
      console.error('Failed to complete activity:', err);
    } finally {
      setCompleting(false);
    }
  };

  const completedActivities = progress.activities_completed || [];
  const totalActivities = checkpoint.activities.length;
  const completedCount = completedActivities.length;

  return (
    <ScrollView style={styles.container}>
      {/* Checkpoint Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{checkpoint.name}</Text>
          <View style={styles.sequenceBadge}>
            <Text style={styles.sequenceText}>#{checkpoint.sequence}</Text>
          </View>
        </View>
        
        <Text style={styles.description}>{checkpoint.description}</Text>
        
        {/* Stats */}
        <View style={styles.stats}>
          {checkpoint.elevation_feet && (
            <View style={styles.stat}>
              <Text style={styles.statIcon}>⛰️</Text>
              <Text style={styles.statText}>{checkpoint.elevation_feet.toLocaleString()} ft</Text>
            </View>
          )}
          <View style={styles.stat}>
            <Text style={styles.statIcon}>📍</Text>
            <Text style={styles.statText}>{Math.round(checkpoint.distance_from_start_meters)} m</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>✨</Text>
            <Text style={styles.statText}>{progress.xp_earned} XP</Text>
          </View>
        </View>
        
        {!isNearby && (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedIcon}>🚶‍♂️</Text>
            <Text style={styles.lockedText}>Keep hiking to unlock activities</Text>
          </View>
        )}
        
        {isNearby && (
          <View style={styles.progressBanner}>
            <Text style={styles.progressIcon}>🎯</Text>
            <Text style={styles.progressText}>
              {completedCount === totalActivities 
                ? 'All activities completed!'
                : `${completedCount}/${totalActivities} activities completed`
              }
            </Text>
          </View>
        )}
      </View>
      
      {/* Activities List */}
      <View style={styles.activitiesSection}>
        <Text style={styles.sectionTitle}>Activities</Text>
        
        {checkpoint.activities.map(activity => {
          const isCompleted = completedActivities.includes(activity.id);
          const isLocked = !isNearby;
          
          return (
            <TouchableOpacity
              key={activity.id}
              onPress={() => !isLocked && !isCompleted && setSelectedActivity(activity)}
              disabled={isLocked || isCompleted}
              style={[
                styles.activityCard,
                isCompleted && styles.activityCardCompleted,
                isLocked && styles.activityCardLocked,
              ]}
            >
              <View style={styles.activityContent}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityIcon}>{getActivityIcon(activity.type)}</Text>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                </View>
                <Text style={styles.activityDescription}>{activity.description}</Text>
                <View style={styles.activityMeta}>
                  <View style={styles.xpBadge}>
                    <Text style={styles.xpText}>+{activity.xp} XP</Text>
                  </View>
                  {activity.estimated_minutes && (
                    <Text style={styles.timeText}>⏱️ {activity.estimated_minutes} min</Text>
                  )}
                  {isCompleted && (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedText}>✓ Completed</Text>
                    </View>
                  )}
                  {isLocked && (
                    <Text style={styles.lockedLabel}>🔒 Locked</Text>
                  )}
                </View>
                {activity.educational_note && isCompleted && (
                  <Text style={styles.educationalNote}>💡 {activity.educational_note}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Activity Modal */}
      {selectedActivity && (
        <ActivityModal
          activity={selectedActivity}
          isCompleting={completing}
          onComplete={handleCompleteActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E463B',
    flex: 1,
  },
  sequenceBadge: {
    backgroundColor: '#D4E9D7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sequenceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A7857',
  },
  description: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontSize: 14,
  },
  statText: {
    fontSize: 14,
    color: '#64748B',
  },
  lockedBanner: {
    marginTop: 16,
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockedIcon: {
    fontSize: 18,
  },
  lockedText: {
    fontSize: 14,
    color: '#92400E',
    flex: 1,
  },
  progressBanner: {
    marginTop: 16,
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressIcon: {
    fontSize: 18,
  },
  progressText: {
    fontSize: 14,
    color: '#065F46',
    flex: 1,
  },
  activitiesSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  activityCardCompleted: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
  },
  activityCardLocked: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.6,
  },
  activityContent: {
    gap: 8,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityIcon: {
    fontSize: 24,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  xpBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
  },
  completedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  lockedLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  educationalNote: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
});

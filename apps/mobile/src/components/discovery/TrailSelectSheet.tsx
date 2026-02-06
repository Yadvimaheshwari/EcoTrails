/**
 * TrailSelectSheet Component (Mobile)
 * Bottom sheet for trail selection on place detail screen
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../config/colors';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { formatMiles, formatFeet, formatDuration } from '../../utils/formatting';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

interface Trail {
  id: string;
  name: string;
  difficulty?: string;
  lengthMiles?: number;
  elevationGainFeet?: number;
  estimatedDurationMinutes?: number;
  description?: string;
  loopType?: string;
}

interface TrailSelectSheetProps {
  visible: boolean;
  trail: Trail | null;
  parkName?: string;
  onClose: () => void;
  onStartHike: () => void;
  loading?: boolean;
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  easy: { bg: '#D1FAE5', text: '#065F46' },
  moderate: { bg: '#FEF3C7', text: '#92400E' },
  hard: { bg: '#FFEDD5', text: '#9A3412' },
  expert: { bg: '#FEE2E2', text: '#991B1B' },
  unknown: { bg: '#F3F4F6', text: '#4B5563' },
};

export const TrailSelectSheet: React.FC<TrailSelectSheetProps> = ({
  visible,
  trail,
  parkName,
  onClose,
  onStartHike,
  loading = false,
}) => {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!trail) return null;

  const difficultyKey = trail.difficulty?.toLowerCase() || 'unknown';
  const difficultyStyle = DIFFICULTY_COLORS[difficultyKey] || DIFFICULTY_COLORS.unknown;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          {/* Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text variant="h2" numberOfLines={2} style={styles.title}>
                {trail.name}
              </Text>
              {parkName && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                  <Text variant="caption" color="secondary" style={styles.parkName}>
                    {parkName}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Difficulty & Type */}
            <View style={styles.tagsRow}>
              <View style={[styles.tag, { backgroundColor: difficultyStyle.bg }]}>
                <Text style={[styles.tagText, { color: difficultyStyle.text }]}>
                  {trail.difficulty || 'Unknown'}
                </Text>
              </View>
              {trail.loopType && (
                <View style={[styles.tag, styles.tagSecondary]}>
                  <Text style={styles.tagTextSecondary}>{trail.loopType}</Text>
                </View>
              )}
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="footsteps-outline" size={20} color={colors.textSecondary} />
                <Text variant="h3" style={styles.statValue}>
                  {formatMiles(trail.lengthMiles)}
                </Text>
                <Text variant="caption" color="secondary">
                  miles
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="trending-up-outline" size={20} color={colors.textSecondary} />
                <Text variant="h3" style={styles.statValue}>
                  {formatFeet(trail.elevationGainFeet)}
                </Text>
                <Text variant="caption" color="secondary">
                  ft gain
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <Text variant="h3" style={styles.statValue}>
                  {formatDuration(trail.estimatedDurationMinutes ? trail.estimatedDurationMinutes / 60 : null)}
                </Text>
                <Text variant="caption" color="secondary">
                  est. time
                </Text>
              </View>
            </View>

            {/* Description */}
            {trail.description && (
              <Text variant="body" color="secondary" style={styles.description} numberOfLines={3}>
                {trail.description}
              </Text>
            )}

            {/* Discovery Teaser */}
            <View style={styles.discoveryTeaser}>
              <Text style={styles.discoveryIcon}>🔍</Text>
              <View style={styles.discoveryText}>
                <Text variant="body" style={styles.discoveryTitle}>
                  Discoveries await!
                </Text>
                <Text variant="caption" color="secondary">
                  Find hidden points of interest as you hike.
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={loading ? 'Starting...' : '🥾 Start Hike'}
              onPress={onStartHike}
              disabled={loading}
              size="lg"
              style={styles.startButton}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SHEET_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  parkName: {
    marginLeft: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagSecondary: {
    backgroundColor: colors.surfaceElevated,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagTextSecondary: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    marginTop: 4,
  },
  description: {
    marginBottom: 16,
    lineHeight: 22,
  },
  discoveryTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  discoveryIcon: {
    fontSize: 28,
  },
  discoveryText: {
    flex: 1,
  },
  discoveryTitle: {
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 2,
  },
  actions: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 32,
  },
  startButton: {
    backgroundColor: colors.primary,
  },
});

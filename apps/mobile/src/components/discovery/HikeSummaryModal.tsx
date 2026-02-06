/**
 * HikeSummaryModal Component (Mobile)
 * Post-hike summary showing discoveries, badges, and stats
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../config/colors';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { CapturedDiscovery, DISCOVERY_ICONS, DISCOVERY_COLORS } from '../../types/discovery';
import { Badge, BADGE_LEVEL_COLORS } from '../../types/badge';
import { formatMiles, formatElapsedTime, formatFeet } from '../../utils/formatting';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HikeSummaryModalProps {
  visible: boolean;
  hikeData: {
    id: string;
    trailName?: string;
    parkName?: string;
    startTime: Date;
    endTime: Date;
    distanceMiles: number;
    elevationGainFeet: number;
    routePoints: Array<{ lat: number; lng: number }>;
  } | null;
  capturedDiscoveries: CapturedDiscovery[];
  earnedBadges: Badge[];
  onClose: () => void;
  onViewJournal: () => void;
  onShareHike: () => void;
}

export const HikeSummaryModal: React.FC<HikeSummaryModalProps> = ({
  visible,
  hikeData,
  capturedDiscoveries,
  earnedBadges,
  onClose,
  onViewJournal,
  onShareHike,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const contentSlide = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(headerSlide, {
          toValue: 0,
          duration: 400,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.timing(contentSlide, {
          toValue: 0,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      headerSlide.setValue(-50);
      contentSlide.setValue(50);
    }
  }, [visible]);

  if (!visible || !hikeData) return null;

  const durationSeconds = Math.round((hikeData.endTime.getTime() - hikeData.startTime.getTime()) / 1000);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <Animated.View
          style={[
            styles.modal,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <Animated.View
              style={[styles.header, { transform: [{ translateY: headerSlide }] }]}
            >
              <View style={styles.celebrationIcon}>
                <Text style={styles.celebrationEmoji}>🎉</Text>
              </View>
              <Text variant="h1" style={styles.headerTitle}>
                Hike Complete!
              </Text>
              {hikeData.trailName && (
                <Text variant="body" color="secondary" style={styles.trailName}>
                  {hikeData.trailName}
                </Text>
              )}
            </Animated.View>

            <Animated.View style={{ transform: [{ translateY: contentSlide }] }}>
              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatMiles(hikeData.distanceMiles)}
                  </Text>
                  <Text variant="caption" color="secondary">
                    Miles
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatElapsedTime(durationSeconds)}
                  </Text>
                  <Text variant="caption" color="secondary">
                    Duration
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatFeet(hikeData.elevationGainFeet)}
                  </Text>
                  <Text variant="caption" color="secondary">
                    Elevation
                  </Text>
                </View>
              </View>

              {/* Discoveries Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text variant="h3">Discoveries</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{capturedDiscoveries.length}</Text>
                  </View>
                </View>

                {capturedDiscoveries.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.discoveriesScroll}
                    contentContainerStyle={styles.discoveriesContent}
                  >
                    {capturedDiscoveries.map((discovery, index) => {
                      const type = (discovery as any).type || 'scenic_view';
                      const icon = DISCOVERY_ICONS[type as keyof typeof DISCOVERY_ICONS] || '📍';
                      const color = DISCOVERY_COLORS[type as keyof typeof DISCOVERY_COLORS] || colors.primary;

                      return (
                        <View key={discovery.id} style={styles.discoveryItem}>
                          <View style={[styles.discoveryIcon, { backgroundColor: color }]}>
                            <Text style={styles.discoveryIconText}>{icon}</Text>
                          </View>
                          <Text
                            variant="caption"
                            numberOfLines={2}
                            style={styles.discoveryName}
                          >
                            {(discovery as any).title || 'Discovery'}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🔍</Text>
                    <Text variant="caption" color="secondary">
                      No discoveries captured this hike
                    </Text>
                  </View>
                )}
              </View>

              {/* Badges Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text variant="h3">Badges Earned</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{earnedBadges.length}</Text>
                  </View>
                </View>

                {earnedBadges.length > 0 ? (
                  <View style={styles.badgesGrid}>
                    {earnedBadges.map((badge) => (
                      <View key={badge.id} style={styles.badgeItem}>
                        <View
                          style={[
                            styles.badgeIcon,
                            { borderColor: BADGE_LEVEL_COLORS[badge.level] },
                          ]}
                        >
                          <Text style={styles.badgeIconText}>{badge.icon}</Text>
                        </View>
                        <Text variant="caption" numberOfLines={1} style={styles.badgeName}>
                          {badge.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🏅</Text>
                    <Text variant="caption" color="secondary">
                      Keep capturing discoveries to earn badges!
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onShareHike}>
              <Ionicons name="share-outline" size={20} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Share</Text>
            </TouchableOpacity>
            <Button
              title="View in Journal"
              onPress={onViewJournal}
              size="md"
              style={styles.primaryButton}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: colors.surface,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 25,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#ECFDF5',
  },
  celebrationIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  celebrationEmoji: {
    fontSize: 36,
  },
  headerTitle: {
    textAlign: 'center',
    marginBottom: 4,
  },
  trailName: {
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  discoveriesScroll: {
    marginHorizontal: -20,
  },
  discoveriesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  discoveryItem: {
    width: 80,
    alignItems: 'center',
  },
  discoveryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  discoveryIconText: {
    fontSize: 24,
  },
  discoveryName: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textSecondary,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  badgeItem: {
    width: (SCREEN_WIDTH - 80 - 32) / 3,
    alignItems: 'center',
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 3,
  },
  badgeIconText: {
    fontSize: 24,
  },
  badgeName: {
    textAlign: 'center',
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 32,
    opacity: 0.5,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    gap: 8,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
  },
});

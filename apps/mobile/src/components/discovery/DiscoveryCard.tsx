/**
 * DiscoveryCard Component (Mobile)
 * Bottom card displayed when a discovery marker is tapped
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../config/colors';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Discovery, DISCOVERY_ICONS, DISCOVERY_COLORS, DIFFICULTY_LABELS } from '../../types/discovery';
import { formatDistanceFeet } from '../../utils/geoUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DiscoveryCardProps {
  discovery: Discovery;
  distanceMeters: number;
  isCaptured: boolean;
  onCapture: () => void;
  onClose: () => void;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
  discovery,
  distanceMeters,
  isCaptured,
  onCapture,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(200)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, []);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 200,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const markerColor = DISCOVERY_COLORS[discovery.type] || colors.primary;
  const icon = DISCOVERY_ICONS[discovery.type] || '📍';
  const rarityInfo = DIFFICULTY_LABELS[discovery.difficulty || 'common'];
  const typeLabel = discovery.type.replace('_', ' ');

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: markerColor }]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          <View style={styles.headerContent}>
            <Text variant="h3" numberOfLines={1}>
              {discovery.title}
            </Text>
            <View style={styles.headerMeta}>
              <Text variant="caption" color="secondary" style={styles.typeLabel}>
                {typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}
              </Text>
              {discovery.difficulty && (
                <View style={[styles.rarityBadge, { backgroundColor: rarityInfo.color }]}>
                  <Text style={styles.rarityText}>{rarityInfo.label}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close-circle" size={28} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Image (if available) */}
        {discovery.imageUrl && (
          <Image source={{ uri: discovery.imageUrl }} style={styles.image} />
        )}

        {/* Description */}
        <Text variant="body" color="secondary" style={styles.description}>
          {discovery.shortText}
        </Text>

        {discovery.longText && (
          <Text variant="caption" color="tertiary" style={styles.longDescription} numberOfLines={2}>
            {discovery.longText}
          </Text>
        )}

        {/* Distance */}
        <View style={styles.distanceRow}>
          <Ionicons name="navigate-outline" size={16} color={colors.textSecondary} />
          <Text variant="caption" color="secondary" style={styles.distanceText}>
            {formatDistanceFeet(distanceMeters)} away
          </Text>
        </View>

        {/* Action */}
        <View style={styles.actions}>
          {isCaptured ? (
            <View style={styles.capturedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.capturedText}>Captured!</Text>
            </View>
          ) : (
            <Button
              title="📸 Capture Discovery"
              onPress={onCapture}
              size="md"
              style={styles.captureButton}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  headerContent: {
    flex: 1,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  typeLabel: {
    textTransform: 'capitalize',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rarityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.surfaceElevated,
  },
  description: {
    lineHeight: 22,
    marginBottom: 8,
  },
  longDescription: {
    lineHeight: 18,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  distanceText: {
    marginLeft: 2,
  },
  actions: {
    alignItems: 'center',
  },
  captureButton: {
    width: '100%',
    backgroundColor: colors.primary,
  },
  capturedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#D1FAE5',
    borderRadius: 24,
  },
  capturedText: {
    color: colors.success,
    fontWeight: '600',
    fontSize: 16,
  },
});

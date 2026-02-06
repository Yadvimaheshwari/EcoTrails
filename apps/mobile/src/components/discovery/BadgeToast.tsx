/**
 * BadgeToast Component (Mobile)
 * Animated celebration toast when a badge is awarded
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { colors } from '../../config/colors';
import { Text } from '../ui/Text';
import { Badge, BADGE_LEVEL_COLORS, BADGE_RARITY_COLORS } from '../../types/badge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BadgeToastProps {
  badge: Badge | null;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export const BadgeToast: React.FC<BadgeToastProps> = ({
  badge,
  visible,
  onHide,
  duration = 3500,
}) => {
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && badge) {
      // Reset
      translateY.setValue(-150);
      opacity.setValue(0);
      scale.setValue(0.5);
      iconScale.setValue(0);
      shimmerAnim.setValue(0);

      // Animate in
      Animated.sequence([
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        // Icon bounce
        Animated.sequence([
          Animated.delay(100),
          Animated.spring(iconScale, {
            toValue: 1.3,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.spring(iconScale, {
            toValue: 1,
            tension: 60,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Shimmer animation
      const shimmer = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      shimmer.start();

      // Auto-hide after duration
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -150,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          shimmer.stop();
          onHide();
        });
      }, duration);

      return () => {
        clearTimeout(timer);
        shimmer.stop();
      };
    }
  }, [visible, badge]);

  if (!visible || !badge) return null;

  const levelColor = BADGE_LEVEL_COLORS[badge.level];
  const rarityColor = BADGE_RARITY_COLORS[badge.rarity];

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {/* Background Glow */}
      <View style={[styles.glowLayer, { backgroundColor: `${levelColor}20` }]} />

      {/* Shimmer Effect */}
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX: shimmerTranslate }],
          },
        ]}
      />

      <View style={styles.content}>
        {/* Badge Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            { borderColor: levelColor },
            { transform: [{ scale: iconScale }] },
          ]}
        >
          <Text style={styles.icon}>{badge.icon}</Text>
        </Animated.View>

        {/* Badge Info */}
        <View style={styles.textContainer}>
          <Text style={styles.label}>Badge Earned!</Text>
          <Text variant="h3" numberOfLines={1} style={styles.name}>
            {badge.name}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
              <Text style={styles.levelText}>
                {badge.level.charAt(0).toUpperCase() + badge.level.slice(1)}
              </Text>
            </View>
            <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
            <Text variant="caption" color="secondary">
              {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
            </Text>
          </View>
        </View>

        {/* Sparkle decorations */}
        <View style={styles.sparkles}>
          <Text style={[styles.sparkle, styles.sparkle1]}>✨</Text>
          <Text style={[styles.sparkle, styles.sparkle2]}>⭐</Text>
          <Text style={[styles.sparkle, styles.sparkle3]}>✨</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 20,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
    overflow: 'hidden',
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 100,
    transform: [{ skewX: '-20deg' }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingRight: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 3,
  },
  icon: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  name: {
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sparkles: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 60,
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    fontSize: 16,
  },
  sparkle1: {
    top: 8,
    right: 12,
  },
  sparkle2: {
    top: '50%',
    right: 8,
    marginTop: -8,
  },
  sparkle3: {
    bottom: 8,
    right: 16,
  },
});

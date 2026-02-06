/**
 * DiscoveryMarker Component (Mobile)
 * Map marker for discoveries with reveal animation
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Marker, Circle } from 'react-native-maps';
import { Discovery, DISCOVERY_ICONS, DISCOVERY_COLORS, DIFFICULTY_LABELS } from '../../types/discovery';
import { colors } from '../../config/colors';

interface DiscoveryMarkerProps {
  discovery: Discovery;
  isRevealed: boolean;
  isCaptured: boolean;
  distanceMeters: number;
  onPress: () => void;
  showRadius?: boolean;
}

export const DiscoveryMarker: React.FC<DiscoveryMarkerProps> = ({
  discovery,
  isRevealed,
  isCaptured,
  distanceMeters,
  onPress,
  showRadius = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRevealed && !isCaptured) {
      // Reveal animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for attention
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else if (isCaptured) {
      scaleAnim.setValue(1);
    } else {
      scaleAnim.setValue(0);
    }
  }, [isRevealed, isCaptured]);

  if (!isRevealed) return null;

  const markerColor = DISCOVERY_COLORS[discovery.type] || colors.primary;
  const icon = DISCOVERY_ICONS[discovery.type] || '📍';
  const rarityInfo = DIFFICULTY_LABELS[discovery.difficulty || 'common'];

  return (
    <>
      {/* Optional reveal radius circle */}
      {showRadius && !isCaptured && (
        <Circle
          center={{ latitude: discovery.lat, longitude: discovery.lng }}
          radius={discovery.revealRadiusMeters || 150}
          strokeColor={`${markerColor}33`}
          fillColor={`${markerColor}11`}
          strokeWidth={1}
        />
      )}

      <Marker
        coordinate={{ latitude: discovery.lat, longitude: discovery.lng }}
        onPress={onPress}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={Platform.OS !== 'android'}
      >
        <Animated.View
          style={[
            styles.markerContainer,
            {
              transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
              opacity: isCaptured ? 0.6 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.marker,
              { backgroundColor: markerColor },
              isCaptured && styles.markerCaptured,
            ]}
          >
            <View style={styles.iconWrapper}>
              <Animated.Text style={styles.icon}>{icon}</Animated.Text>
            </View>
            {isCaptured && (
              <View style={styles.checkmark}>
                <Animated.Text style={styles.checkmarkText}>✓</Animated.Text>
              </View>
            )}
          </View>
          
          {/* Rarity indicator dot */}
          {!isCaptured && discovery.difficulty && discovery.difficulty !== 'common' && (
            <View
              style={[
                styles.rarityDot,
                { backgroundColor: rarityInfo.color },
              ]}
            />
          )}
        </Animated.View>
      </Marker>
    </>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 3,
    borderColor: 'white',
  },
  markerCaptured: {
    backgroundColor: colors.textTertiary,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  rarityDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
});

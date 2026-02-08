import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing } from '../../shared/design';
import { Text } from './Text';

interface LoadingStateProps {
  message?: string;
  variant?: 'default' | 'shimmer' | 'breathing';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  variant = 'default',
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const breathingAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (variant === 'shimmer') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (variant === 'breathing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathingAnim, {
            toValue: 1.1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(breathingAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [variant]);

  if (variant === 'shimmer') {
    const opacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.container}>
        <Animated.View style={[styles.shimmer, { opacity }]} />
        <Text variant="body" color="secondary" style={styles.message}>
          {message}
        </Text>
      </View>
    );
  }

  if (variant === 'breathing') {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.breathingCircle,
            {
              transform: [{ scale: breathingAnim }],
            },
          ]}
        />
        <Text variant="body" color="secondary" style={styles.message}>
          {message}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.spinner} />
      <Text variant="body" color="secondary" style={styles.message}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.border,
    borderTopColor: colors.pineGreen,
    marginBottom: spacing.lg,
  },
  shimmer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.stoneGray,
    marginBottom: spacing.lg,
  },
  breathingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.pineGreen,
    opacity: 0.3,
    marginBottom: spacing.lg,
  },
  message: {
    marginTop: spacing.lg,
  },
});

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

import { colors, radius, space, shadow } from '../tokens';

export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle; elevated?: boolean }> = ({
  children,
  style,
  elevated = false,
}) => {
  return <View style={[styles.base, elevated && styles.elevated, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    ...(shadow.md as any),
  },
});


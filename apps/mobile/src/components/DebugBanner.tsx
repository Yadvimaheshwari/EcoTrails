import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigationState } from '@react-navigation/native';

import { colors } from '../config/colors';
import { Text } from './ui/Text';
import { API_BASE_URL } from '../config/api';

function getActiveRouteName(state: any): string {
  try {
    if (!state || !state.routes || typeof state.index !== 'number') return 'unknown';
    let current = state.routes[state.index];
    while (current?.state) {
      const s = current.state;
      current = s.routes?.[s.index ?? 0];
    }
    return current?.name || 'unknown';
  } catch {
    return 'unknown';
  }
}

export const DebugBanner: React.FC = () => {
  const navState = useNavigationState((s) => s);

  const routeName = useMemo(() => getActiveRouteName(navState), [navState]);
  const buildTimestamp =
    (process.env.EXPO_PUBLIC_BUILD_TIMESTAMP as string | undefined) ||
    (process.env.NEXT_PUBLIC_BUILD_TIMESTAMP as string | undefined) ||
    'unknown';

  const show = __DEV__ || process.env.EXPO_PUBLIC_SHOW_DEBUG_BANNER === '1';
  if (!show) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      <Text variant="caption" style={styles.text} numberOfLines={2}>
        Route: {routeName} • API: {API_BASE_URL} • Build: {buildTimestamp}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.70)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    zIndex: 9999,
  },
  text: {
    color: colors.surface,
    fontSize: 12,
  },
});


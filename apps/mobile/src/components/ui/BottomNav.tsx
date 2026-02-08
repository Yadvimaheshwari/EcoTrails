import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../shared/design';
import { Text } from './Text';

interface BottomNavItem {
  icon: string;
  label: string;
  active?: boolean;
  onPress: () => void;
}

interface BottomNavProps {
  items: BottomNavItem[];
}

export const BottomNav: React.FC<BottomNavProps> = ({ items }) => {
  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.item, item.active && styles.itemActive]}
          onPress={item.onPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={item.icon as any}
            size={24}
            color={item.active ? colors.pineGreen : colors.textTertiary}
          />
          <Text
            variant="caption"
            style={[
              styles.label,
              item.active && styles.labelActive,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.fogWhite,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.sm,
    height: 64,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  itemActive: {
    // Subtle highlight for active state
  },
  label: {
    marginTop: spacing.xs,
    color: colors.textTertiary,
    fontFamily: 'Inter_500Medium',
  },
  labelActive: {
    color: colors.pineGreen,
  },
});

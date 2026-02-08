import React from 'react';
import { StyleProp, View, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, borderRadius } from '../../shared/design';
import { Text } from './Text';

interface ChipProps {
  label: string;
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'default',
  size = 'md',
  onPress,
  style,
}) => {
  const Component = onPress ? TouchableOpacity : View;
  
  const chipStyle: StyleProp<ViewStyle> = [styles.chip, styles[`chip_${variant}`], styles[`chip_${size}`], style];

  const textStyle: StyleProp<TextStyle> = [styles.text, styles[`text_${variant}`], styles[`text_${size}`]];

  return (
    <Component style={chipStyle} onPress={onPress} activeOpacity={0.7}>
      <Text variant="caption" style={textStyle}>
        {label}
      </Text>
    </Component>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip_default: {
    backgroundColor: colors.stoneGray,
  },
  chip_primary: {
    backgroundColor: colors.pineGreen,
  },
  chip_accent: {
    backgroundColor: colors.skyAccent,
  },
  chip_success: {
    backgroundColor: colors.success,
  },
  chip_warning: {
    backgroundColor: colors.warning,
  },
  chip_error: {
    backgroundColor: colors.error,
  },
  chip_sm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chip_md: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  text: {
    fontFamily: 'Inter_500Medium',
  },
  text_default: {
    color: colors.text,
  },
  text_primary: {
    color: colors.fogWhite,
  },
  text_accent: {
    color: colors.fogWhite,
  },
  text_success: {
    color: colors.fogWhite,
  },
  text_warning: {
    color: colors.fogWhite,
  },
  text_error: {
    color: colors.fogWhite,
  },
  text_sm: {
    fontSize: 12,
  },
  text_md: {
    fontSize: 14,
  },
});

import React from 'react';
import { Text as RNText, StyleProp, StyleSheet, TextStyle } from 'react-native';
import { colors } from '../../shared/design';
import { typography } from '../../config/typography';

interface TextProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label';
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export const Text: React.FC<TextProps> = ({
  children,
  variant = 'body',
  color = 'primary',
  style,
  numberOfLines,
}) => {
  const textStyle: StyleProp<TextStyle> = [styles.base, styles[variant], styles[`color_${color}`], style];

  return (
    <RNText style={textStyle} numberOfLines={numberOfLines}>
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.fontFamily.regular,
  },
  h1: {
    fontSize: typography.fontSize['4xl'],
    fontFamily: typography.fontFamily.bold,
    lineHeight: typography.fontSize['4xl'] * typography.lineHeight.tight,
  },
  h2: {
    fontSize: typography.fontSize['3xl'],
    fontFamily: typography.fontFamily.bold,
    lineHeight: typography.fontSize['3xl'] * typography.lineHeight.tight,
  },
  h3: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.semibold,
    lineHeight: typography.fontSize['2xl'] * typography.lineHeight.normal,
  },
  h4: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.semibold,
    lineHeight: typography.fontSize.xl * typography.lineHeight.normal,
  },
  body: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  caption: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  color_primary: {
    color: colors.text,
  },
  color_secondary: {
    color: colors.textSecondary,
  },
  color_tertiary: {
    color: colors.textTertiary,
  },
  color_accent: {
    color: colors.primary,
  },
});

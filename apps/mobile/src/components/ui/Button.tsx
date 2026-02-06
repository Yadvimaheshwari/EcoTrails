import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors, borderRadius, spacing } from '@ecotrails/shared/design';
import { typography } from '../../config/typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
}) => {
  const buttonStyle: ViewStyle[] = [styles.button, styles[`button_${variant}`], styles[`button_${size}`]];
  const textStyle: TextStyle[] = [styles.text, styles[`text_${variant}`], styles[`text_${size}`]];

  if (disabled || loading) {
    buttonStyle.push(styles.buttonDisabled);
  }

  return (
    <TouchableOpacity
      style={[...buttonStyle, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.surface : colors.primary} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: parseInt(borderRadius.base),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  button_primary: {
    backgroundColor: colors.primary,
  },
  button_secondary: {
    backgroundColor: colors.accent,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  button_ghost: {
    backgroundColor: 'transparent',
  },
  button_sm: {
    paddingHorizontal: parseInt(spacing[4]),
    paddingVertical: parseInt(spacing[2]),
    minHeight: 36,
  },
  button_md: {
    paddingHorizontal: parseInt(spacing[6]),
    paddingVertical: parseInt(spacing[3]),
    minHeight: 48,
  },
  button_lg: {
    paddingHorizontal: parseInt(spacing[8]),
    paddingVertical: parseInt(spacing[4]),
    minHeight: 56,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: typography.fontFamily.medium,
  },
  text_primary: {
    color: colors.surface,
  },
  text_secondary: {
    color: colors.surface,
  },
  text_outline: {
    color: colors.primary,
  },
  text_ghost: {
    color: colors.primary,
  },
  text_sm: {
    fontSize: typography.fontSize.sm,
  },
  text_md: {
    fontSize: typography.fontSize.base,
  },
  text_lg: {
    fontSize: typography.fontSize.lg,
  },
});

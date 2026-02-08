import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, radius, space, type } from '../tokens';

type ButtonVariant = 'primary' | 'outline' | 'ghost';

export const Button: React.FC<{
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}> = ({ title, onPress, variant = 'primary', loading = false, disabled = false, style }) => {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[`v_${variant}`],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.card : colors.primary} />
      ) : (
        <Text style={[styles.text, styles[`t_${variant}`]]}>{title}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    paddingHorizontal: space[5],
    paddingVertical: space[3],
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  v_primary: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  v_outline: { backgroundColor: 'transparent', borderColor: colors.primarySoft },
  v_ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  text: { fontFamily: type.fontFamily.semibold, fontSize: type.size.sm },
  t_primary: { color: colors.card },
  t_outline: { color: colors.primarySoft },
  t_ghost: { color: colors.primarySoft },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});


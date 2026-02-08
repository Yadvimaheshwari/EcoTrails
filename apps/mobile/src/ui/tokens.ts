/**
 * Mobile design tokens (mirrors web Tailwind-ish scale).
 * Source of truth is the web app; these tokens intentionally map to the same values.
 */
import { colors as baseColors, typography as baseType, spacing as baseSpacing, borderRadius as baseRadius, shadows as baseShadows } from '../shared/design';

// Web-ish spacing scale: align to Tailwind keys commonly used in the web app.
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  sm: baseRadius.md, // 8
  md: baseRadius.lg, // 12
  lg: baseRadius.xl, // 16
  xl: baseRadius['3xl'], // 24
  pill: baseRadius.full,
} as const;

export const colors = {
  ...baseColors,
  // semantic aliases used by UI primitives
  bg: baseColors.fogWhite,
  card: baseColors.surface,
  text: baseColors.text,
  mutedText: baseColors.textSecondary,
  border: baseColors.border,
  primary: baseColors.pineGreen,
  primarySoft: baseColors.mossGreen,
} as const;

export const type = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  size: {
    xs: parseInt(baseType.fontSize.xs),
    sm: parseInt(baseType.fontSize.sm),
    base: parseInt(baseType.fontSize.base),
    lg: parseInt(baseType.fontSize.lg),
    xl: parseInt(baseType.fontSize.xl),
    '2xl': parseInt(baseType.fontSize['2xl']),
    '3xl': parseInt(baseType.fontSize['3xl']),
    '4xl': parseInt(baseType.fontSize['4xl']),
  },
  lineHeight: baseType.lineHeight,
} as const;

export const shadow = baseShadows;


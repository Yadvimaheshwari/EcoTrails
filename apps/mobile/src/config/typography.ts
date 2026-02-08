import { typography as designTypography } from '../shared/design';

export const typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  fontSize: {
    xs: parseInt(designTypography.fontSize.xs),
    sm: parseInt(designTypography.fontSize.sm),
    base: parseInt(designTypography.fontSize.base),
    lg: parseInt(designTypography.fontSize.lg),
    xl: parseInt(designTypography.fontSize.xl),
    '2xl': parseInt(designTypography.fontSize['2xl']),
    '3xl': parseInt(designTypography.fontSize['3xl']),
    '4xl': parseInt(designTypography.fontSize['4xl']),
  },
  lineHeight: {
    tight: designTypography.lineHeight.tight,
    normal: designTypography.lineHeight.normal,
    relaxed: designTypography.lineHeight.relaxed,
  },
};

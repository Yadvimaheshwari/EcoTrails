import { colors as designColors } from '../shared/design';

export const colors = {
  ...designColors,
  // Legacy aliases for compatibility
  background: designColors.fogWhite,
  surface: designColors.surface,
  surfaceElevated: designColors.surfaceElevated,
  primary: designColors.pineGreen,
  primaryLight: designColors.primaryLight,
  primaryDark: designColors.primaryDark,
  accent: designColors.skyAccent,
  accentLight: designColors.accentLight,
  text: designColors.text,
  textSecondary: designColors.textSecondary,
  textTertiary: designColors.textTertiary,
  success: designColors.success,
  warning: designColors.warning,
  error: designColors.error,
  border: designColors.border,
  divider: designColors.divider,
  overlay: designColors.overlay,
  overlayLight: designColors.overlayLight,
};

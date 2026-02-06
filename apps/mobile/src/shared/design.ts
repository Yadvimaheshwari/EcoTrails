/**
 * Shared design tokens for EcoTrails mobile app.
 * This module provides the same design system used across the web and mobile apps.
 * Mapped from @ecotrails/shared/design.
 */

export const colors = {
  // Brand Colors
  pineGreen: '#0F3D2E',
  mossGreen: '#4F8A6B',
  alpineBlue: '#4C7EF3',
  discoveryGold: '#F4A340',

  // Background
  fogWhite: '#F6F8F7',
  background: '#F6F8F7',
  backgroundGradient: '#EDF3F0',
  stoneGray: '#E8E8E3',

  // Surfaces
  surface: '#FFFFFF',
  surfaceElevated: '#FAFAF8',

  // Primary shades
  primary: '#0F3D2E',
  primaryLight: '#4F8A6B',
  primaryDark: '#0A2A1F',

  // Accent
  accent: '#4C7EF3',
  skyAccent: '#4C7EF3',
  accentLight: '#6B9AFF',

  // Text
  text: '#1B1F1E',
  textSecondary: '#5F6F6A',
  textTertiary: '#9B9B98',

  // Semantic
  success: '#4F8A6B',
  warning: '#F4A340',
  error: '#C87A7A',
  info: '#4C7EF3',

  // Borders
  border: '#E8E8E3',
  divider: '#D8D8D3',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',

  // Difficulty Colors
  difficultyEasy: '#4F8A6B',
  difficultyModerate: '#4A9B9B',
  difficultyHard: '#4C7EF3',
  difficultyExpert: '#F4A340',
};

export const typography = {
  fontSize: {
    xs: '12',
    sm: '14',
    base: '16',
    lg: '18',
    xl: '20',
    '2xl': '24',
    '3xl': '30',
    '4xl': '36',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

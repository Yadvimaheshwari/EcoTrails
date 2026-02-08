/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // New Brand Colors
        background: '#F6F8F7',
        backgroundGradient: '#EDF3F0',
        text: '#1B1F1E',
        textSecondary: '#5F6F6A',
        surface: '#FFFFFF',
        surfaceElevated: '#FAFAF8',
        // Brand Colors
        pineGreen: '#0F3D2E',
        mossGreen: '#4F8A6B',
        alpineBlue: '#4C7EF3',
        discoveryGold: '#F4A340',
        // Legacy (keeping for compatibility)
        fogWhite: '#F6F8F7',
        stoneGray: '#E8E8E3',
        primary: '#0F3D2E',
        primaryLight: '#4F8A6B',
        primaryDark: '#0A2A1F',
        accent: '#4C7EF3',
        accentLight: '#6B9AFF',
        textTertiary: '#9B9B98',
        success: '#4F8A6B',
        warning: '#F4A340',
        error: '#C87A7A',
        info: '#4C7EF3',
        border: '#E8E8E3',
        divider: '#D8D8D3',
        // Difficulty Colors
        difficultyEasy: '#4F8A6B',
        difficultyModerate: '#4A9B9B',
        difficultyHard: '#4C7EF3',
        difficultyExpert: '#F4A340',
      },
      fontFamily: {
        sans: ['Sao Torpes", "ui-sans-serif", "system-ui'],
        display: ['Sao Torpes', 'Georgia', 'serif'],
      },
      fontSize: {
        '4xl': ['36px', { lineHeight: '1.2' }],
        '3xl': ['30px', { lineHeight: '1.2' }],
        '2xl': ['24px', { lineHeight: '1.5' }],
        xl: ['20px', { lineHeight: '1.5' }],
        lg: ['18px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        xs: ['12px', { lineHeight: '1.5' }],
      },
    },
  },
  plugins: [],
}

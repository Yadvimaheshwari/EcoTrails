import React from 'react';
import { Text as RNText, StyleSheet, TextStyle, View } from 'react-native';

import { colors, type } from '../tokens';

type CommonProps = {
  children: React.ReactNode;
  style?: TextStyle;
  numberOfLines?: number;
};

export const Title: React.FC<CommonProps & { level?: 1 | 2 | 3 }> = ({ children, level = 1, style, numberOfLines }) => {
  return (
    <RNText
      style={[styles.base, level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </RNText>
  );
};

export const BodyText: React.FC<CommonProps & { muted?: boolean }> = ({ children, muted = false, style, numberOfLines }) => {
  return (
    <RNText style={[styles.base, styles.body, muted && styles.muted, style]} numberOfLines={numberOfLines}>
      {children}
    </RNText>
  );
};

export const SectionHeader: React.FC<{ title: string; right?: React.ReactNode; style?: TextStyle }> = ({
  title,
  right,
}) => {
  return (
    <View style={styles.sectionRow}>
      <RNText style={[styles.base, styles.sectionTitle]}>{title}</RNText>
      {right ? <View>{right}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    fontFamily: type.fontFamily.regular,
  },
  h1: {
    fontSize: type.size['3xl'],
    fontFamily: type.fontFamily.bold,
    lineHeight: type.size['3xl'] * type.lineHeight.tight,
  },
  h2: {
    fontSize: type.size['2xl'],
    fontFamily: type.fontFamily.bold,
    lineHeight: type.size['2xl'] * type.lineHeight.tight,
  },
  h3: {
    fontSize: type.size.xl,
    fontFamily: type.fontFamily.semibold,
    lineHeight: type.size.xl * type.lineHeight.normal,
  },
  body: {
    fontSize: type.size.base,
    lineHeight: type.size.base * type.lineHeight.normal,
  },
  muted: {
    color: colors.mutedText,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: type.size.lg,
    fontFamily: type.fontFamily.semibold,
  },
});


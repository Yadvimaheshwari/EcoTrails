import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, space } from '../tokens';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  padding?: number;
};

export const Screen: React.FC<ScreenProps> = ({ children, scroll = true, style, contentStyle, padding = space[4] }) => {
  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={[{ padding }, contentStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ padding, flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});


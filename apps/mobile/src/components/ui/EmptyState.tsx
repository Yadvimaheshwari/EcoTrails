import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../shared/design';
import { Text } from './Text';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'leaf-outline',
  title,
  message,
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={64} color={colors.textTertiary} />
      <Text variant="h3" style={styles.title}>{title}</Text>
      <Text variant="body" color="secondary" style={styles.message}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['4xl'],
  },
  title: {
    marginTop: spacing['2xl'],
    marginBottom: spacing.sm,
  },
  message: {
    textAlign: 'center',
    maxWidth: 300,
  },
});

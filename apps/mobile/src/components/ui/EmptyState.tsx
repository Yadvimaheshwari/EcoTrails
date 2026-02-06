import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@ecotrails/shared/design';
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
    padding: spacing[8],
  },
  title: {
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  message: {
    textAlign: 'center',
    maxWidth: 300,
  },
});

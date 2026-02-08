import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../shared/design';
import { Text } from './Text';

interface MapOverlayProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const MapOverlay: React.FC<MapOverlayProps> = ({
  title,
  subtitle,
  onClose,
  children,
}) => {
  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text variant="h3">{title}</Text>
            {subtitle && (
              <Text variant="caption" color="secondary">{subtitle}</Text>
            )}
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
        {children && <View style={styles.body}>{children}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.fogWhite,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...shadows.lg,
  },
  content: {
    padding: spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerContent: {
    flex: 1,
  },
  closeButton: {
    padding: spacing.sm,
  },
  body: {
    marginTop: spacing.sm,
  },
});

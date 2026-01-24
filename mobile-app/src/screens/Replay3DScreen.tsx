/**
 * 3D Replay Screen
 * Visualizes hike path in 3D (placeholder for future implementation)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Replay3DScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>3D Replay</Text>
      <Text style={styles.subtitle}>
        Coming soon: Visualize your hike path in 3D terrain
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F7',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D4739',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8B82',
    textAlign: 'center',
  },
});

export default Replay3DScreen;

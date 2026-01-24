/**
 * Trail Selection Screen
 * Similar to AllTrails - shows available trails/parks
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

interface Park {
  name: string;
  icon: string;
  coords: string;
}

const PARKS: Park[] = [
  { name: 'Sarek National Park', icon: '🏔️', coords: '67.3° N, 17.6° E' },
  { name: 'Yosemite Valley', icon: '🌲', coords: '37.8° N, 119.5° W' },
  { name: 'Lake District Peaks', icon: '⛰️', coords: '54.4° N, 3.1° W' },
  { name: 'Blue Ridge Parkway', icon: '🌿', coords: '35.5° N, 82.5° W' },
];

const TrailSelectionScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPark = async (park: Park) => {
    setLoading(park.name);
    try {
      // Create session
      const sessionResponse = await axios.post(`${API_BASE_URL}/api/v1/sessions`, {
        park_name: park.name,
      });

      const sessionId = sessionResponse.data.session_id;

      // Navigate to active hike
      navigation.navigate('ActiveHike', {
        sessionId,
        parkName: park.name,
        deviceId: 'ecodroid-001', // In production, get from device pairing
      });
    } catch (error: any) {
      console.error('Error creating session:', error);
      // Show user-friendly error message
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to start hike. Please check your connection.';
      // In production, use Alert.alert() here
      console.warn('Session creation failed:', errorMessage);
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Trail</Text>
        <Text style={styles.subtitle}>Select a park to begin your journey</Text>
      </View>

      <FlatList
        data={PARKS}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.parkCard}
            onPress={() => handleSelectPark(item)}
            disabled={!!loading}
          >
            {loading === item.name && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#2D4739" />
              </View>
            )}
            <Text style={styles.parkIcon}>{item.icon}</Text>
            <View style={styles.parkInfo}>
              <Text style={styles.parkName}>{item.name}</Text>
              <Text style={styles.parkCoords}>{item.coords}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F7',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D4739',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8B82',
  },
  listContent: {
    padding: 20,
  },
  parkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  parkIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  parkInfo: {
    flex: 1,
  },
  parkName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D4739',
    marginBottom: 4,
  },
  parkCoords: {
    fontSize: 14,
    color: '#8E8B82',
  },
  arrow: {
    fontSize: 24,
    color: '#2D4739',
    opacity: 0.3,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TrailSelectionScreen;

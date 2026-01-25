/**
 * Record Hike Screen
 * Start a new hike recording session
 * IMPORTANT: No auto-start - user must explicitly tap "Start Recording"
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const RecordHikeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedTrail, setSelectedTrail] = useState<string | null>(null);

  const handleStartRecording = () => {
    // Confirm before starting
    Alert.alert(
      'Start Recording',
      selectedTrail
        ? 'Start recording your hike on this trail?'
        : 'Start recording your hike without a selected trail?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start Recording',
          style: 'default',
          onPress: () => {
            // Navigate to ActiveHike screen
            navigation.navigate('ActiveHike' as never, {
              trailId: selectedTrail,
            } as never);
          },
        },
      ]
    );
  };

  const handleSelectTrail = () => {
    // Navigate to trail selection
    // This will be a modal that returns the selected trail
    navigation.navigate('Explore' as never, {
      screen: 'TrailList',
      params: { selectMode: true },
    } as never);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Record Hike</Text>
        <Text style={styles.subtitle}>
          Start recording your hiking adventure
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trail Selection</Text>
        <Text style={styles.sectionDescription}>
          Select a trail (optional) or start recording without one
        </Text>

        {selectedTrail ? (
          <View style={styles.selectedTrail}>
            <Text style={styles.selectedTrailText}>Selected: {selectedTrail}</Text>
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => setSelectedTrail(null)}
            >
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.selectButton}
            onPress={handleSelectTrail}
          >
            <Text style={styles.selectButtonText}>Select Trail</Text>
            <Text style={styles.selectButtonIcon}>→</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ready to Start?</Text>
        <Text style={styles.sectionDescription}>
          Tap the button below to begin recording your hike. You can track your
          route, capture photos, and record environmental data.
        </Text>

        <TouchableOpacity
          style={[
            styles.startButton,
            !selectedTrail && styles.startButtonWithoutTrail,
          ]}
          onPress={handleStartRecording}
        >
          <Text style={styles.startButtonText}>Start Recording</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>What gets recorded?</Text>
        <View style={styles.infoList}>
          <Text style={styles.infoItem}>📍 GPS route and location</Text>
          <Text style={styles.infoItem}>📸 Photos you capture</Text>
          <Text style={styles.infoItem}>🌿 Environmental observations</Text>
          <Text style={styles.infoItem}>📊 Fitness metrics (if available)</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F7',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D4739',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8B82',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D4739',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8B82',
    marginBottom: 16,
    lineHeight: 20,
  },
  selectButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2D4739',
    borderStyle: 'dashed',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D4739',
  },
  selectButtonIcon: {
    fontSize: 20,
    color: '#2D4739',
  },
  selectedTrail: {
    backgroundColor: '#E2E8DE',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedTrailText: {
    fontSize: 16,
    color: '#2D4739',
    fontWeight: '500',
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeButtonText: {
    fontSize: 14,
    color: '#2D4739',
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#2D4739',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  startButtonWithoutTrail: {
    backgroundColor: '#8E8B82',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D4739',
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: 14,
    color: '#8E8B82',
    lineHeight: 20,
  },
});

export default RecordHikeScreen;

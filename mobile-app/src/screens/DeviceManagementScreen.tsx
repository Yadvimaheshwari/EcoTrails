/**
 * Device Management Screen
 * Manage wearable and health device connections
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';

const DeviceManagementScreen: React.FC = () => {
  const [appleHealthConnected, setAppleHealthConnected] = useState(false);
  const [googleFitConnected, setGoogleFitConnected] = useState(false);
  const [dataSyncEnabled, setDataSyncEnabled] = useState(false);

  const handleConnectAppleHealth = () => {
    // TODO: Implement Apple Health connection
    Alert.alert('Apple Health', 'Connection feature coming soon');
  };

  const handleConnectGoogleFit = () => {
    // TODO: Implement Google Fit connection
    Alert.alert('Google Fit', 'Connection feature coming soon');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Device Management</Text>
        <Text style={styles.subtitle}>Connect your health and fitness devices</Text>
      </View>

      {/* Data Sync Toggle */}
      <View style={styles.section}>
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>Data Sync</Text>
            <Text style={styles.settingDescription}>
              Automatically sync health data from connected devices
            </Text>
          </View>
          <Switch
            value={dataSyncEnabled}
            onValueChange={setDataSyncEnabled}
            trackColor={{ false: '#E2E8DE', true: '#2D4739' }}
          />
        </View>
      </View>

      {/* Apple Health */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Apple Health</Text>
        <View style={styles.deviceCard}>
          <View style={styles.deviceHeader}>
            <Text style={styles.deviceName}>Apple Health</Text>
            <View
              style={[
                styles.statusBadge,
                appleHealthConnected ? styles.statusConnected : styles.statusDisconnected,
              ]}
            >
              <Text style={styles.statusText}>
                {appleHealthConnected ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
          </View>
          <Text style={styles.deviceDescription}>
            Sync heart rate, steps, and workout data from Apple Health
          </Text>
          <TouchableOpacity
            style={[
              styles.connectButton,
              appleHealthConnected && styles.connectButtonConnected,
            ]}
            onPress={handleConnectAppleHealth}
          >
            <Text
              style={[
                styles.connectButtonText,
                appleHealthConnected && styles.connectButtonTextConnected,
              ]}
            >
              {appleHealthConnected ? 'Disconnect' : 'Connect'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Google Fit */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Google Fit</Text>
        <View style={styles.deviceCard}>
          <View style={styles.deviceHeader}>
            <Text style={styles.deviceName}>Google Fit</Text>
            <View
              style={[
                styles.statusBadge,
                googleFitConnected ? styles.statusConnected : styles.statusDisconnected,
              ]}
            >
              <Text style={styles.statusText}>
                {googleFitConnected ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
          </View>
          <Text style={styles.deviceDescription}>
            Sync heart rate, steps, and workout data from Google Fit
          </Text>
          <TouchableOpacity
            style={[
              styles.connectButton,
              googleFitConnected && styles.connectButtonConnected,
            ]}
            onPress={handleConnectGoogleFit}
          >
            <Text
              style={[
                styles.connectButtonText,
                googleFitConnected && styles.connectButtonTextConnected,
              ]}
            >
              {googleFitConnected ? 'Disconnect' : 'Connect'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Data Collection Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Collection</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What data is collected?</Text>
          <Text style={styles.infoText}>
            • Heart rate and heart rate zones{'\n'}
            • Steps and distance{'\n'}
            • Workout duration and calories{'\n'}
            • Elevation gain/loss
          </Text>
          <Text style={styles.infoSubtext}>
            All data is stored locally on your device and only synced when you explicitly start a hike.
          </Text>
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
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8DE',
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
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8DE',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D4739',
    padding: 20,
    paddingBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8DE',
  },
  settingLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D4739',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8B82',
    lineHeight: 20,
  },
  deviceCard: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8DE',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D4739',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  statusDisconnected: {
    backgroundColor: '#E2E8DE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deviceDescription: {
    fontSize: 14,
    color: '#8E8B82',
    marginBottom: 16,
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#2D4739',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectButtonConnected: {
    backgroundColor: '#F9F9F7',
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  connectButtonTextConnected: {
    color: '#2D4739',
  },
  infoCard: {
    padding: 20,
    backgroundColor: '#F9F9F7',
    borderRadius: 12,
    margin: 20,
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D4739',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#2D4739',
    lineHeight: 24,
    marginBottom: 12,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#8E8B82',
    lineHeight: 18,
  },
});

export default DeviceManagementScreen;

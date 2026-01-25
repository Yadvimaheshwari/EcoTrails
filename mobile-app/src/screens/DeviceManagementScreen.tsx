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

// Stub interfaces for health integrations
interface HealthService {
  isAvailable(): Promise<boolean>;
  isConnected(): Promise<boolean>;
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  getStatus(): Promise<'connected' | 'disconnected' | 'unavailable'>;
}

// Stub implementations (real implementations would use react-native-health or similar)
const AppleHealthService: HealthService = {
  async isAvailable() {
    // Stub: Check if Apple Health is available on iOS
    return Promise.resolve(false); // Will be true on iOS with HealthKit
  },
  async isConnected() {
    // Stub: Check connection status
    return Promise.resolve(false);
  },
  async connect() {
    // Stub: Request HealthKit permissions and connect
    return Promise.resolve(true);
  },
  async disconnect() {
    // Stub: Disconnect from HealthKit
    return Promise.resolve();
  },
  async getStatus() {
    const available = await this.isAvailable();
    if (!available) return 'unavailable';
    const connected = await this.isConnected();
    return connected ? 'connected' : 'disconnected';
  },
};

const GoogleFitService: HealthService = {
  async isAvailable() {
    // Stub: Check if Google Fit is available on Android
    return Promise.resolve(false); // Will be true on Android with Google Fit
  },
  async isConnected() {
    // Stub: Check connection status
    return Promise.resolve(false);
  },
  async connect() {
    // Stub: Request Google Fit permissions and connect
    return Promise.resolve(true);
  },
  async disconnect() {
    // Stub: Disconnect from Google Fit
    return Promise.resolve();
  },
  async getStatus() {
    const available = await this.isAvailable();
    if (!available) return 'unavailable';
    const connected = await this.isConnected();
    return connected ? 'connected' : 'disconnected';
  },
};

const DeviceManagementScreen: React.FC = () => {
  const [appleHealthStatus, setAppleHealthStatus] = useState<'connected' | 'disconnected' | 'unavailable'>('unavailable');
  const [googleFitStatus, setGoogleFitStatus] = useState<'connected' | 'disconnected' | 'unavailable'>('unavailable');
  const [dataSyncEnabled, setDataSyncEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    checkDeviceStatus();
  }, []);

  const checkDeviceStatus = async () => {
    try {
      setLoading(true);
      const [appleStatus, googleStatus] = await Promise.all([
        AppleHealthService.getStatus(),
        GoogleFitService.getStatus(),
      ]);
      setAppleHealthStatus(appleStatus);
      setGoogleFitStatus(googleStatus);
    } catch (error) {
      console.error('Error checking device status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAppleHealth = async () => {
    try {
      if (appleHealthStatus === 'connected') {
        // Disconnect
        await AppleHealthService.disconnect();
        setAppleHealthStatus('disconnected');
        Alert.alert('Disconnected', 'Apple Health has been disconnected');
      } else {
        // Connect
        const success = await AppleHealthService.connect();
        if (success) {
          setAppleHealthStatus('connected');
          Alert.alert('Connected', 'Apple Health has been connected successfully');
        } else {
          Alert.alert('Error', 'Failed to connect to Apple Health');
        }
      }
    } catch (error: any) {
      console.error('Error connecting to Apple Health:', error);
      Alert.alert('Error', error.message || 'Failed to connect to Apple Health');
    }
  };

  const handleConnectGoogleFit = async () => {
    try {
      if (googleFitStatus === 'connected') {
        // Disconnect
        await GoogleFitService.disconnect();
        setGoogleFitStatus('disconnected');
        Alert.alert('Disconnected', 'Google Fit has been disconnected');
      } else {
        // Connect
        const success = await GoogleFitService.connect();
        if (success) {
          setGoogleFitStatus('connected');
          Alert.alert('Connected', 'Google Fit has been connected successfully');
        } else {
          Alert.alert('Error', 'Failed to connect to Google Fit');
        }
      }
    } catch (error: any) {
      console.error('Error connecting to Google Fit:', error);
      Alert.alert('Error', error.message || 'Failed to connect to Google Fit');
    }
  };

  const appleHealthConnected = appleHealthStatus === 'connected';
  const googleFitConnected = googleFitStatus === 'connected';

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
                appleHealthStatus === 'connected' 
                  ? styles.statusConnected 
                  : appleHealthStatus === 'unavailable'
                  ? styles.statusUnavailable
                  : styles.statusDisconnected,
              ]}
            >
              <Text style={styles.statusText}>
                {appleHealthStatus === 'connected' 
                  ? 'Connected' 
                  : appleHealthStatus === 'unavailable'
                  ? 'Unavailable'
                  : 'Not Connected'}
              </Text>
            </View>
          </View>
          <Text style={styles.deviceDescription}>
            Sync heart rate, steps, and workout data from Apple Health
          </Text>
          {appleHealthStatus !== 'unavailable' && (
            <TouchableOpacity
              style={[
                styles.connectButton,
                appleHealthConnected && styles.connectButtonConnected,
                loading && styles.connectButtonDisabled,
              ]}
              onPress={handleConnectAppleHealth}
              disabled={loading}
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
          )}
          {appleHealthStatus === 'unavailable' && (
            <Text style={styles.unavailableText}>
              Apple Health is only available on iOS devices
            </Text>
          )}
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
                googleFitStatus === 'connected' 
                  ? styles.statusConnected 
                  : googleFitStatus === 'unavailable'
                  ? styles.statusUnavailable
                  : styles.statusDisconnected,
              ]}
            >
              <Text style={styles.statusText}>
                {googleFitStatus === 'connected' 
                  ? 'Connected' 
                  : googleFitStatus === 'unavailable'
                  ? 'Unavailable'
                  : 'Not Connected'}
              </Text>
            </View>
          </View>
          <Text style={styles.deviceDescription}>
            Sync heart rate, steps, and workout data from Google Fit
          </Text>
          {googleFitStatus !== 'unavailable' && (
            <TouchableOpacity
              style={[
                styles.connectButton,
                googleFitConnected && styles.connectButtonConnected,
                loading && styles.connectButtonDisabled,
              ]}
              onPress={handleConnectGoogleFit}
              disabled={loading}
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
          )}
          {googleFitStatus === 'unavailable' && (
            <Text style={styles.unavailableText}>
              Google Fit is only available on Android devices
            </Text>
          )}
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
  statusUnavailable: {
    backgroundColor: '#F5F5F5',
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
  connectButtonDisabled: {
    opacity: 0.5,
  },
  unavailableText: {
    fontSize: 13,
    color: '#8E8B82',
    fontStyle: 'italic',
    marginTop: 8,
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

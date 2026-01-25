/**
 * Settings Screen
 * User settings and preferences
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
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [fitnessEnabled, setFitnessEnabled] = useState(false);

  React.useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const locationStatus = await Location.getForegroundPermissionsAsync();
      setLocationEnabled(locationStatus.granted);
      // TODO: Check fitness/motion permissions
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // TODO: Clear cache
            Alert.alert('Success', 'Cache cleared');
          },
        },
      ]
    );
  };

  const handleResetTutorial = () => {
    Alert.alert(
      'Reset Tutorial',
      'This will show the onboarding tutorial again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            // TODO: Reset tutorial
            Alert.alert('Success', 'Tutorial will show on next app launch');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement logout
            navigation.navigate('Profile' as never);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingLabel}>Edit Profile</Text>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Permissions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>Location</Text>
            <Text style={styles.settingDescription}>
              {locationEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <Switch
            value={locationEnabled}
            onValueChange={async (value) => {
              if (value) {
                const { status } = await Location.requestForegroundPermissionsAsync();
                setLocationEnabled(status === 'granted');
              } else {
                setLocationEnabled(false);
              }
            }}
            trackColor={{ false: '#E2E8DE', true: '#2D4739' }}
          />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>Motion & Fitness</Text>
            <Text style={styles.settingDescription}>
              {fitnessEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <Switch
            value={fitnessEnabled}
            onValueChange={setFitnessEnabled}
            trackColor={{ false: '#E2E8DE', true: '#2D4739' }}
          />
        </View>
      </View>

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <TouchableOpacity style={styles.settingItem} onPress={handleClearCache}>
          <Text style={styles.settingLabel}>Clear Cache</Text>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={handleResetTutorial}>
          <Text style={styles.settingLabel}>Reset Tutorial</Text>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
          <Text style={[styles.settingLabel, styles.logoutText]}>Sign Out</Text>
        </TouchableOpacity>
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
  },
  settingArrow: {
    fontSize: 18,
    color: '#8E8B82',
  },
  logoutText: {
    color: '#D32F2F',
  },
});

export default SettingsScreen;

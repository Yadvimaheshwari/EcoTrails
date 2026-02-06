import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { useAuthStore } from '../store/useAuthStore';
import { UploadQueue } from '../components/UploadQueue';

export const ProfileScreen: React.FC = ({ navigation }: any) => {
  const { user, logout } = useAuthStore();
  const [offlineDownloads, setOfflineDownloads] = useState(false);

  const handleConnectDevice = (type: string) => {
    if (type === 'wearable') {
      navigation.navigate('DeviceManager');
    } else if (type === 'ecodroid') {
      navigation.navigate('EcoDroidConnect');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text variant="h2">You</Text>
          {user && (
            <Text variant="body" color="secondary" style={styles.email}>
              {user.email}
            </Text>
          )}
        </View>

        <UploadQueue />

        <Card style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Devices</Text>
          
          <TouchableOpacity
            style={styles.deviceItem}
            onPress={() => handleConnectDevice('wearable')}
          >
            <Ionicons name="watch-outline" size={24} color={colors.primary} />
            <View style={styles.deviceContent}>
              <Text variant="body">Wearable Device</Text>
              <Text variant="caption" color="secondary">Apple Watch, Garmin, Fitbit</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deviceItem}
            onPress={() => handleConnectDevice('ecodroid')}
          >
            <Ionicons name="hardware-chip-outline" size={24} color={colors.primary} />
            <View style={styles.deviceContent}>
              <Text variant="body">EcoDroid</Text>
              <Text variant="caption" color="secondary">Environmental sensors</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        <Card style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text variant="body">Offline Downloads</Text>
              <Text variant="caption" color="secondary">Download maps for offline use</Text>
            </View>
            <Switch
              value={offlineDownloads}
              onValueChange={setOfflineDownloads}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={colors.surface}
            />
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text variant="body">Privacy</Text>
              <Text variant="caption" color="secondary">Manage your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text variant="body">Subscription</Text>
              <Text variant="caption" color="secondary">Free / Premium</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text variant="body" color="accent">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 8,
  },
  email: {
    marginTop: 4,
  },
  section: {
    margin: 20,
    marginTop: 0,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deviceContent: {
    flex: 1,
    marginLeft: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingContent: {
    flex: 1,
  },
  footer: {
    padding: 20,
    paddingTop: 0,
  },
  logoutButton: {
    alignItems: 'center',
    padding: 16,
  },
});

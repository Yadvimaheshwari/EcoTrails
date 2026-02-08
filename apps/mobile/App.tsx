import React, { useEffect, useState } from 'react';
import { View, Text as RNText, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './src/store/useAuthStore';
import { initializeDB } from './src/services/offlineQueue';
import { TabNavigator } from './src/navigation/TabNavigator';
import { TrailDetailScreen } from './src/screens/TrailDetailScreen';
import { PlaceDetailScreen } from './src/screens/PlaceDetailScreen';
import { TrackingSetupScreen } from './src/screens/TrackingSetupScreen';
import { EndHikeScreen } from './src/screens/EndHikeScreen';
import { PostHikeReportScreen } from './src/screens/PostHikeReportScreen';
import { CaptureMomentScreen } from './src/screens/CaptureMomentScreen';
import { MediaPickerScreen } from './src/screens/MediaPickerScreen';
import { DeviceManagerScreen } from './src/screens/DeviceManagerScreen';
import { AppleWatchConnectScreen } from './src/screens/AppleWatchConnectScreen';
import { GarminConnectScreen } from './src/screens/GarminConnectScreen';
import { FitbitConnectScreen } from './src/screens/FitbitConnectScreen';
import { HikeDetailScreen } from './src/screens/HikeDetailScreen';
import { TripPlannerScreen } from './src/screens/TripPlannerScreen';
import { TripPlansScreen } from './src/screens/TripPlansScreen';
import { TripPlanDetailScreen } from './src/screens/TripPlanDetailScreen';
import { OfflineMapsScreen } from './src/screens/OfflineMapsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { colors } from './src/config/colors';
import { DebugBanner } from './src/components/DebugBanner';
import { API_BASE_URL } from './src/config/api';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

// Lazy-load DuringHikeScreen to avoid react-native-reanimated native crash
// with older Expo Go versions. Loaded on-demand when user navigates to it.
let DuringHikeScreenComponent: React.ComponentType<any> | null = null;

const DuringHikeScreenWrapper = (props: any) => {
  const [Screen, setScreen] = useState<React.ComponentType<any> | null>(
    DuringHikeScreenComponent
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!Screen) {
      try {
        const mod = require('./src/screens/DuringHikeScreen');
        DuringHikeScreenComponent = mod.DuringHikeScreen;
        setScreen(() => mod.DuringHikeScreen);
      } catch (e) {
        console.warn('DuringHikeScreen failed to load:', e);
        setError(true);
      }
    }
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F6F8F7' }}>
        <RNText style={{ fontSize: 20, fontWeight: 'bold', color: '#0F3D2E', textAlign: 'center' }}>
          Hike Mode Unavailable
        </RNText>
        <RNText style={{ fontSize: 14, color: '#5F6F6A', marginTop: 12, textAlign: 'center' }}>
          Please update your Expo Go app from the App Store to use live hike tracking.
        </RNText>
      </View>
    );
  }

  if (!Screen) return null;
  return <Screen {...props} />;
};

export default function App() {
  const { loadAuth, isLoading, user } = useAuthStore();
  const [appReady, setAppReady] = useState(false);
  const enableLegacyScreens = process.env.EXPO_PUBLIC_ENABLE_LEGACY_SCREENS === '1';

  useEffect(() => {
    const init = async () => {
      console.log('[EcoTrails] API_BASE_URL:', API_BASE_URL);
      try {
        initializeDB();
      } catch (e) {
        console.warn('DB init failed (non-fatal):', e);
      }
      await loadAuth();
      setAppReady(true);
    };
    init();
  }, []);

  if (!appReady || isLoading) {
    return null;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={() => {
        try {
          const r = navigationRef.getCurrentRoute();
          if (r?.name) {
            console.log('[EcoTrails] Route:', r.name);
          }
        } catch {
          // ignore
        }
      }}
    >
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="HikeDetail" component={HikeDetailScreen} />
            <Stack.Screen name="TripPlanner" component={TripPlannerScreen} />
            <Stack.Screen name="TripPlans" component={TripPlansScreen} />
            <Stack.Screen name="TripPlanDetail" component={TripPlanDetailScreen} />
            <Stack.Screen name="TrailDetail" component={TrailDetailScreen} />
            <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} />
            <Stack.Screen name="TrackingSetup" component={TrackingSetupScreen} />
            <Stack.Screen name="DuringHike" component={DuringHikeScreenWrapper} />
            <Stack.Screen name="EndHike" component={EndHikeScreen} />
            <Stack.Screen name="PostHikeReport" component={PostHikeReportScreen} />
            {enableLegacyScreens ? (
              <>
                <Stack.Screen name="DeviceManager" component={DeviceManagerScreen} />
                <Stack.Screen name="AppleWatchConnect" component={AppleWatchConnectScreen} />
                <Stack.Screen name="GarminConnect" component={GarminConnectScreen} />
                <Stack.Screen name="FitbitConnect" component={FitbitConnectScreen} />
                <Stack.Screen name="EcoDroidConnect" component={EcoDroidConnectScreen} />
              </>
            ) : null}
            <Stack.Screen name="CaptureMoment" component={CaptureMomentScreen} />
            <Stack.Screen name="MediaPicker" component={MediaPickerScreen} />
            <Stack.Screen name="OfflineMaps" component={OfflineMapsScreen} />
          </>
        )}
      </Stack.Navigator>
      {/* DebugBanner must be inside NavigationContainer but rendered after Stack.Navigator */}
      <DebugBanner />
    </NavigationContainer>
  );
}

// Placeholder screen for EcoDroid
const EcoDroidConnectScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <RNText style={{ fontSize: 24, fontWeight: 'bold', color: '#0F3D2E' }}>Connect EcoDroid</RNText>
    <RNText style={{ fontSize: 16, color: '#5F6F6A', marginTop: 16, textAlign: 'center' }}>
      EcoDroid device connection flow will be implemented here
    </RNText>
  </View>
);

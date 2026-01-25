/**
 * EcoAtlas Mobile App
 * Main entry point for React Native application
 * 
 * Navigation Structure:
 * - Root Stack Navigator
 *   - Main Tab Navigator (5 tabs)
 *   - Modal Flows (Active Hike, Trail Detail, etc.)
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';

// Tab Screens
import TrailSelectionScreen from './src/screens/TrailSelectionScreen';
import MapScreen from './src/screens/MapScreen';
import RecordHikeScreen from './src/screens/RecordHikeScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Stack Screens (Modals/Details)
import ActiveHikeScreen from './src/screens/ActiveHikeScreen';
import PostHikeInsightsScreen from './src/screens/PostHikeInsightsScreen';
import Replay3DScreen from './src/screens/Replay3DScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ParkDetailScreen from './src/screens/ParkDetailScreen';
import TrailDetailScreen from './src/screens/TrailDetailScreen';
import HikeSummaryScreen from './src/screens/HikeSummaryScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DeviceManagementScreen from './src/screens/DeviceManagementScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Explore Tab Stack
function ExploreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TrailList" component={TrailSelectionScreen} />
      <Stack.Screen name="ParkDetail" component={ParkDetailScreen} />
      <Stack.Screen name="TrailDetail" component={TrailDetailScreen} />
    </Stack.Navigator>
  );
}

// Activity Tab Stack
function ActivityStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ActivityList" component={ActivityScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="PostHike" component={PostHikeInsightsScreen} />
      <Stack.Screen name="Replay3D" component={Replay3DScreen} />
      <Stack.Screen name="HikeSummary" component={HikeSummaryScreen} />
      <Stack.Screen name="Statistics" component={StatisticsScreen} />
    </Stack.Navigator>
  );
}

// Profile Tab Stack
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="DeviceManagement" component={DeviceManagementScreen} />
    </Stack.Navigator>
  );
}

// Main Tab Navigator with 5 tabs
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#2D4739',
          borderTopColor: '#E2E8DE',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#8E8B82',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="Explore" 
        component={ExploreStack}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🧭</Text>,
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🗺️</Text>,
        }}
      />
      <Tab.Screen 
        name="RecordHike" 
        component={RecordHikeScreen}
        options={{
          tabBarLabel: 'Record',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📹</Text>,
        }}
      />
      <Tab.Screen 
        name="Activity" 
        component={ActivityStack}
        options={{
          tabBarLabel: 'Activity',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📔</Text>,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            presentation: 'modal', // Modals slide up from bottom
          }}
        >
          {/* Main Tab Navigator */}
          <Stack.Screen name="Main" component={MainTabs} />
          
          {/* Modal Flows */}
          <Stack.Screen 
            name="ActiveHike" 
            component={ActiveHikeScreen}
            options={{
              presentation: 'fullScreenModal', // Full screen modal
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

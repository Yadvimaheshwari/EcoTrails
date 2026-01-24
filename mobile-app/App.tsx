/**
 * EcoAtlas Mobile App
 * Main entry point for React Native application
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';

// Screens
import TrailSelectionScreen from './src/screens/TrailSelectionScreen';
import ActiveHikeScreen from './src/screens/ActiveHikeScreen';
import PostHikeInsightsScreen from './src/screens/PostHikeInsightsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import Replay3DScreen from './src/screens/Replay3DScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#2D4739',
          borderTopColor: '#E2E8DE',
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#8E8B82',
      }}
    >
      <Tab.Screen 
        name="Discovery" 
        component={TrailSelectionScreen}
        options={{
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🧭</Text>,
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📔</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="ActiveHike" component={ActiveHikeScreen} />
          <Stack.Screen name="PostHike" component={PostHikeInsightsScreen} />
          <Stack.Screen name="Replay3D" component={Replay3DScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

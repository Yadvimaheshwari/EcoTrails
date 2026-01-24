/**
 * API Configuration
 * Handles dynamic API URL detection for simulators vs physical devices
 */
import { Platform } from 'react-native';

// For iOS Simulator and Android Emulator, use localhost
// For physical devices, you need to use your computer's local IP
// You can find it with: ifconfig | grep "inet " | grep -v 127.0.0.1
const getApiBaseUrl = (): string => {
  // Check if we're in development mode
  // @ts-ignore - __DEV__ is a global in React Native
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;
  
  if (!isDev) {
    // Production: use environment variable or default
    return process.env.API_BASE_URL || 'https://api.ecoatlas.com';
  }

  // Development: detect platform
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }

  // For simulators/emulators, localhost works
  // For physical devices, replace with your computer's IP
  // Example: 'http://192.168.1.100:8000'
  // You can set this via environment variable: DEVICE_IP=192.168.1.100
  const DEVICE_IP = process.env.DEVICE_IP || 'localhost';
  
  return `http://${DEVICE_IP}:8000`;
};

export const API_BASE_URL = getApiBaseUrl();

// Helper to convert HTTP URL to WebSocket URL
export const getWebSocketUrl = (httpUrl: string): string => {
  return httpUrl.replace(/^http/, 'ws');
};

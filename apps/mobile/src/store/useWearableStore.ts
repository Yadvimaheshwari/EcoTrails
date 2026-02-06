import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WearableState {
  appleWatch: {
    connected: boolean;
    token?: string;
  };
  garmin: {
    connected: boolean;
    apiKey?: string;
    apiSecret?: string;
  };
  fitbit: {
    connected: boolean;
    accessToken?: string;
  };
  connectAppleWatch: () => Promise<void>;
  connectGarmin: (apiKey: string, apiSecret: string) => Promise<void>;
  connectFitbit: (accessToken: string) => Promise<void>;
  disconnect: (type: string) => Promise<void>;
  getConnectedDevices: () => string[];
}

export const useWearableStore = create<WearableState>((set, get) => ({
  appleWatch: { connected: false },
  garmin: { connected: false },
  fitbit: { connected: false },

  connectAppleWatch: async () => {
    const token = `apple_watch_token_${Date.now()}`;
    await AsyncStorage.setItem('wearable_apple_watch', JSON.stringify({ connected: true, token }));
    set({ appleWatch: { connected: true, token } });
  },

  connectGarmin: async (apiKey: string, apiSecret: string) => {
    await AsyncStorage.setItem('wearable_garmin', JSON.stringify({ connected: true, apiKey, apiSecret }));
    set({ garmin: { connected: true, apiKey, apiSecret } });
  },

  connectFitbit: async (accessToken: string) => {
    await AsyncStorage.setItem('wearable_fitbit', JSON.stringify({ connected: true, accessToken }));
    set({ fitbit: { connected: true, accessToken } });
  },

  disconnect: async (type: string) => {
    await AsyncStorage.removeItem(`wearable_${type}`);
    if (type === 'apple_watch') {
      set({ appleWatch: { connected: false } });
    } else if (type === 'garmin') {
      set({ garmin: { connected: false } });
    } else if (type === 'fitbit') {
      set({ fitbit: { connected: false } });
    }
  },

  getConnectedDevices: () => {
    const state = get();
    const devices: string[] = [];
    if (state.appleWatch.connected) devices.push('apple_watch');
    if (state.garmin.connected) devices.push('garmin');
    if (state.fitbit.connected) devices.push('fitbit');
    return devices;
  },
}));

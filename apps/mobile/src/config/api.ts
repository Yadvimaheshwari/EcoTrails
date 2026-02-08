import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

// On a physical device, localhost refers to the phone itself.
// Use the dev machine's LAN IP so the phone can reach the backend.
const DEV_MACHINE_IP =
  Constants.expoConfig?.hostUri?.split(':')[0] ?? '10.0.0.143';

const ENV_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ||
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ||
  (process.env.NEXT_PUBLIC_API_URL as string | undefined);

export const API_BASE_URL = ENV_BASE
  ? ENV_BASE
  : __DEV__
    ? `http://${DEV_MACHINE_IP}:8000`
    : 'https://api.ecotrails.app';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Load token from storage on app start
AsyncStorage.getItem('auth_token').then((token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    AsyncStorage.setItem('auth_token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    AsyncStorage.removeItem('auth_token');
  }
}

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      setAuthToken(null);
      // You might want to navigate to login screen here
    }
    return Promise.reject(error);
  }
);

// --- Convenience API helpers (used by screens) ---
export async function getJournalEntries(params?: { hikeId?: string; entryType?: string; limit?: number }) {
  const limit = params?.limit ?? 50;
  const queryParams: Record<string, string | number> = { limit };
  if (params?.hikeId) queryParams.hike_id = params.hikeId;
  if (params?.entryType) queryParams.entry_type = params.entryType;
  return api.get('/api/v1/journal', { params: queryParams });
}

/**
 * Update journal metadata. FastAPI expects the raw metadata dict as the JSON body for this endpoint.
 */
export async function updateJournalEntryMetadata(entryId: string, metadata: Record<string, any>) {
  return api.put(`/api/v1/journal/${entryId}`, metadata);
}

export async function searchPlaces(query: string, limit = 20) {
  return api.get('/api/v1/places/search', { params: { query, limit } });
}

export async function planTrip(placeId: string, visitDate: string) {
  return api.post(`/api/v1/places/${placeId}/plan-trip`, null, { params: { visit_date: visitDate } });
}

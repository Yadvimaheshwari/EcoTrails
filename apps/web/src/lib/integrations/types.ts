/**
 * Integration Types for EcoTrails
 * Handles connected gear and health data sources
 */

export type IntegrationProvider = 'apple_health' | 'garmin' | 'strava';

export interface IntegrationStatus {
  provider: IntegrationProvider;
  connected: boolean;
  lastSync?: string; // ISO timestamp
  error?: string;
}

export interface IntegrationPreferences {
  importLast30Days: boolean;
  autoSyncAfterHike: boolean;
}

export interface UserIntegrations {
  statuses: IntegrationStatus[];
  promptDismissed: boolean;
  preferences: Record<IntegrationProvider, IntegrationPreferences>;
}

export interface ProviderMetadata {
  id: IntegrationProvider;
  name: string;
  description: string;
  dataTypes: string[];
  logo: string; // emoji or icon name
  requiresMobile?: boolean;
  supportsOAuth: boolean;
}

export interface ConnectResponse {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

export interface DisconnectResponse {
  success: boolean;
  error?: string;
}

export interface IntegrationStatusResponse {
  statuses: IntegrationStatus[];
  preferences: Record<IntegrationProvider, IntegrationPreferences>;
}

// Provider metadata constants
export const PROVIDER_METADATA: Record<IntegrationProvider, ProviderMetadata> = {
  apple_health: {
    id: 'apple_health',
    name: 'Apple Health',
    description: 'Import heart rate, workouts, elevation, and activity data from Apple Health.',
    dataTypes: ['Heart Rate', 'Workouts', 'Elevation', 'Steps'],
    logo: '🍎',
    requiresMobile: true,
    supportsOAuth: false,
  },
  garmin: {
    id: 'garmin',
    name: 'Garmin Connect',
    description: 'Sync GPS tracks, heart rate zones, and detailed activity metrics from Garmin devices.',
    dataTypes: ['GPS Tracks', 'Heart Rate Zones', 'VO2 Max', 'Training Load'],
    logo: '🔷',
    supportsOAuth: true,
  },
  strava: {
    id: 'strava',
    name: 'Strava',
    description: 'Import activities, routes, and achievements from Strava.',
    dataTypes: ['Activities', 'Routes', 'Segments', 'Kudos'],
    logo: '🟠',
    supportsOAuth: true,
  },
};

/**
 * Local Storage Utilities for Integration Preferences
 */

const INTEGRATION_PROMPT_KEY = 'ecotrails_integration_prompt_dismissed';
const INTEGRATION_PREFERENCES_KEY = 'ecotrails_integration_preferences';

export function hasSeenIntegrationPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(INTEGRATION_PROMPT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setIntegrationPromptDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INTEGRATION_PROMPT_KEY, 'true');
  } catch (error) {
    console.error('Failed to save integration prompt state:', error);
  }
}

export interface StoredPreferences {
  [provider: string]: {
    importLast30Days: boolean;
    autoSyncAfterHike: boolean;
  };
}

export function getIntegrationPreferences(): StoredPreferences {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(INTEGRATION_PREFERENCES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function saveIntegrationPreferences(preferences: StoredPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INTEGRATION_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save integration preferences:', error);
  }
}

export function updateProviderPreference(
  provider: string,
  key: 'importLast30Days' | 'autoSyncAfterHike',
  value: boolean
): void {
  const preferences = getIntegrationPreferences();
  if (!preferences[provider]) {
    preferences[provider] = {
      importLast30Days: false,
      autoSyncAfterHike: false,
    };
  }
  preferences[provider][key] = value;
  saveIntegrationPreferences(preferences);
}

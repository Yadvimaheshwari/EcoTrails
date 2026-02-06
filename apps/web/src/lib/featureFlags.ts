/**
 * Feature Flags
 * Simple feature flag system using environment variables
 */

export const FEATURE_FLAGS = {
  AI_JOURNAL_NARRATIVE: process.env.NEXT_PUBLIC_FEATURE_AI_JOURNAL_NARRATIVE === 'true',
} as const;

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag] || false;
}

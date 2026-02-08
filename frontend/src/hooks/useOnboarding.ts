/**
 * useOnboarding Hook
 * React hook for accessing onboarding state and personalization
 */

'use client';

import { useState, useEffect } from 'react';
import {
  isOnboardingCompleted,
  getPersonalization,
  OnboardingPersonalization,
} from '@/lib/onboardingStorage';

interface UseOnboardingReturn {
  isCompleted: boolean;
  personalization: OnboardingPersonalization;
  hasPreferences: boolean;
}

/**
 * Hook to access onboarding completion status and user preferences
 * 
 * @example
 * ```tsx
 * function TrailList() {
 *   const { isCompleted, personalization, hasPreferences } = useOnboarding();
 * 
 *   if (!hasPreferences) {
 *     return <div>Complete onboarding to get personalized recommendations</div>;
 *   }
 * 
 *   const filteredTrails = trails.filter(trail =>
 *     personalization.preferredDifficulty.includes(trail.difficulty)
 *   );
 * 
 *   return <TrailGrid trails={filteredTrails} />;
 * }
 * ```
 */
export function useOnboarding(): UseOnboardingReturn {
  const [isCompleted, setIsCompleted] = useState(false);
  const [personalization, setPersonalization] = useState<OnboardingPersonalization>({
    hikingStyle: [],
    preferredDifficulty: [],
  });

  useEffect(() => {
    // Check completion status
    const completed = isOnboardingCompleted();
    setIsCompleted(completed);

    // Load personalization if completed
    if (completed) {
      const prefs = getPersonalization();
      setPersonalization(prefs);
    }
  }, []);

  const hasPreferences =
    personalization.hikingStyle.length > 0 ||
    personalization.preferredDifficulty.length > 0;

  return {
    isCompleted,
    personalization,
    hasPreferences,
  };
}

/**
 * Get user-friendly labels for hiking styles
 */
export const HIKING_STYLE_LABELS: Record<string, string> = {
  leisure: 'Leisure Explorer',
  weekend: 'Weekend Hiker',
  peak: 'Peak Chaser',
  collector: 'National Park Collector',
};

/**
 * Get user-friendly labels and colors for difficulties
 */
export const DIFFICULTY_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  easy: { label: 'Easy', color: '#4F8A6B', icon: '🥾' },
  moderate: { label: 'Moderate', color: '#4A9B9B', icon: '⛰️' },
  hard: { label: 'Hard', color: '#4C7EF3', icon: '🏔️' },
  expert: { label: 'Expert', color: '#F4A340', icon: '🧗' },
};

/**
 * Helper to filter trails by user preferences
 */
export function filterTrailsByPreferences<T extends { difficulty?: string }>(
  trails: T[],
  personalization: OnboardingPersonalization
): T[] {
  if (personalization.preferredDifficulty.length === 0) {
    return trails;
  }

  return trails.filter((trail) =>
    trail.difficulty
      ? personalization.preferredDifficulty.includes(trail.difficulty.toLowerCase())
      : true
  );
}

/**
 * Helper to get a personalized greeting based on hiking style
 */
export function getPersonalizedGreeting(
  personalization: OnboardingPersonalization
): string {
  const style = personalization.hikingStyle[0];

  const greetings: Record<string, string> = {
    leisure: "Let's explore something beautiful today",
    weekend: 'Ready for your next adventure?',
    peak: 'Time to conquer new heights',
    collector: 'Which park will you explore next?',
  };

  return style ? greetings[style] : 'Welcome back, hiker';
}

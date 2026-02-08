/**
 * Onboarding State Persistence
 * Stores user progress, preferences, and completion status
 */

export interface OnboardingPersonalization {
  hikingStyle: string[];
  preferredDifficulty: string[];
}

export interface OnboardingState {
  completed: boolean;
  currentStep: number;
  personalization: OnboardingPersonalization;
  completedAt?: string;
}

const STORAGE_KEY = 'ecotrails_onboarding';

const DEFAULT_STATE: OnboardingState = {
  completed: false,
  currentStep: 1,
  personalization: {
    hikingStyle: [],
    preferredDifficulty: [],
  },
};

/**
 * Load onboarding state from localStorage
 */
export function loadOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_STATE;
    }

    const parsed = JSON.parse(stored) as OnboardingState;
    
    // Validate structure
    if (typeof parsed.completed !== 'boolean') {
      return DEFAULT_STATE;
    }

    return {
      ...DEFAULT_STATE,
      ...parsed,
    };
  } catch (error) {
    console.error('Failed to load onboarding state:', error);
    return DEFAULT_STATE;
  }
}

/**
 * Save onboarding state to localStorage
 */
export function saveOnboardingState(state: Partial<OnboardingState>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const current = loadOnboardingState();
    const updated = { ...current, ...state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save onboarding state:', error);
  }
}

/**
 * Check if onboarding is completed
 */
export function isOnboardingCompleted(): boolean {
  const state = loadOnboardingState();
  return state.completed;
}

/**
 * Mark onboarding as completed
 */
export function completeOnboarding(): void {
  saveOnboardingState({
    completed: true,
    completedAt: new Date().toISOString(),
  });
}

/**
 * Update current step
 */
export function updateCurrentStep(step: number): void {
  saveOnboardingState({ currentStep: step });
}

/**
 * Save personalization preferences
 */
export function savePersonalization(personalization: OnboardingPersonalization): void {
  saveOnboardingState({ personalization });
}

/**
 * Get personalization preferences
 */
export function getPersonalization(): OnboardingPersonalization {
  const state = loadOnboardingState();
  return state.personalization;
}

/**
 * Reset onboarding state (for testing/debugging)
 */
export function resetOnboarding(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset onboarding:', error);
  }
}

/**
 * Get current step
 */
export function getCurrentStep(): number {
  const state = loadOnboardingState();
  return state.currentStep;
}

/**
 * Tests for onboarding storage utilities
 */

import {
  loadOnboardingState,
  saveOnboardingState,
  isOnboardingCompleted,
  completeOnboarding,
  updateCurrentStep,
  savePersonalization,
  getPersonalization,
  getCurrentStep,
  resetOnboarding,
} from '../onboardingStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('onboardingStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('loadOnboardingState', () => {
    it('should return default state when nothing is stored', () => {
      const state = loadOnboardingState();
      expect(state.completed).toBe(false);
      expect(state.currentStep).toBe(1);
      expect(state.personalization.hikingStyle).toEqual([]);
      expect(state.personalization.preferredDifficulty).toEqual([]);
    });

    it('should load saved state', () => {
      const testState = {
        completed: false,
        currentStep: 3,
        personalization: {
          hikingStyle: ['weekend'],
          preferredDifficulty: ['moderate'],
        },
      };

      localStorageMock.setItem('ecotrails_onboarding', JSON.stringify(testState));

      const state = loadOnboardingState();
      expect(state.completed).toBe(false);
      expect(state.currentStep).toBe(3);
      expect(state.personalization.hikingStyle).toEqual(['weekend']);
    });
  });

  describe('saveOnboardingState', () => {
    it('should save partial state updates', () => {
      saveOnboardingState({ currentStep: 2 });

      const state = loadOnboardingState();
      expect(state.currentStep).toBe(2);
      expect(state.completed).toBe(false);
    });

    it('should merge with existing state', () => {
      saveOnboardingState({ currentStep: 2 });
      saveOnboardingState({ completed: true });

      const state = loadOnboardingState();
      expect(state.currentStep).toBe(2);
      expect(state.completed).toBe(true);
    });
  });

  describe('isOnboardingCompleted', () => {
    it('should return false when not completed', () => {
      expect(isOnboardingCompleted()).toBe(false);
    });

    it('should return true when completed', () => {
      completeOnboarding();
      expect(isOnboardingCompleted()).toBe(true);
    });
  });

  describe('completeOnboarding', () => {
    it('should mark onboarding as completed with timestamp', () => {
      completeOnboarding();

      const state = loadOnboardingState();
      expect(state.completed).toBe(true);
      expect(state.completedAt).toBeDefined();
    });
  });

  describe('updateCurrentStep', () => {
    it('should update the current step', () => {
      updateCurrentStep(4);

      const step = getCurrentStep();
      expect(step).toBe(4);
    });
  });

  describe('personalization', () => {
    it('should save and retrieve personalization', () => {
      const prefs = {
        hikingStyle: ['peak', 'weekend'],
        preferredDifficulty: ['hard', 'expert'],
      };

      savePersonalization(prefs);

      const retrieved = getPersonalization();
      expect(retrieved.hikingStyle).toEqual(['peak', 'weekend']);
      expect(retrieved.preferredDifficulty).toEqual(['hard', 'expert']);
    });
  });

  describe('resetOnboarding', () => {
    it('should clear all onboarding data', () => {
      completeOnboarding();
      updateCurrentStep(5);
      savePersonalization({
        hikingStyle: ['weekend'],
        preferredDifficulty: ['moderate'],
      });

      resetOnboarding();

      const state = loadOnboardingState();
      expect(state.completed).toBe(false);
      expect(state.currentStep).toBe(1);
      expect(state.personalization.hikingStyle).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle corrupted localStorage data', () => {
      localStorageMock.setItem('ecotrails_onboarding', 'invalid json');

      const state = loadOnboardingState();
      expect(state.completed).toBe(false);
      expect(state.currentStep).toBe(1);
    });

    it('should handle invalid state structure', () => {
      localStorageMock.setItem('ecotrails_onboarding', JSON.stringify({ invalid: true }));

      const state = loadOnboardingState();
      expect(state.completed).toBe(false);
    });
  });
});

/**
 * Onboarding Flow Page
 * 6-step premium onboarding experience
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { Step1Purpose } from '@/components/onboarding/Step1Purpose';
import { Step2Tracks } from '@/components/onboarding/Step2Tracks';
import { Step3Discovery } from '@/components/onboarding/Step3Discovery';
import { Step4SafetyOffline } from '@/components/onboarding/Step4SafetyOffline';
import { Step5Personalize } from '@/components/onboarding/Step5Personalize';
import { Step6Auth } from '@/components/onboarding/Step6Auth';
import {
  getCurrentStep,
  updateCurrentStep,
  completeOnboarding,
  isOnboardingCompleted,
} from '@/lib/onboardingStorage';

const TOTAL_STEPS = 6;

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Check if onboarding is already completed
  useEffect(() => {
    if (isOnboardingCompleted()) {
      router.replace('/explore');
      return;
    }

    // Restore saved step
    const savedStep = getCurrentStep();
    if (savedStep > 1) {
      setCurrentStep(savedStep);
    }
  }, [router]);

  // Reduce motion check
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const transitionDuration = prefersReducedMotion ? 0 : 200;

  const goToStep = (step: number) => {
    if (step < 1 || step > TOTAL_STEPS) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(step);
      updateCurrentStep(step);
      setIsTransitioning(false);
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }, transitionDuration);
  };

  const handleNext = () => {
    goToStep(currentStep + 1);
  };

  const handleBack = () => {
    goToStep(currentStep - 1);
  };

  const handleComplete = (authMethod?: string) => {
    completeOnboarding();
    
    // In a real app, you would handle auth here
    // For now, just mark completed and redirect
    if (authMethod) {
      console.log('Auth method selected:', authMethod);
      // TODO: Implement actual authentication
    }
    
    router.push('/explore');
  };

  const handleSkip = () => {
    // User skipped auth but still completed onboarding
    completeOnboarding();
    router.push('/explore');
  };

  // Render current step content
  const renderStep = () => {
    const commonProps = {
      onContinue: handleNext,
      onBack: handleBack,
    };

    switch (currentStep) {
      case 1:
        return <Step1Purpose onContinue={handleNext} />;
      case 2:
        return <Step2Tracks {...commonProps} />;
      case 3:
        return <Step3Discovery {...commonProps} />;
      case 4:
        return <Step4SafetyOffline {...commonProps} />;
      case 5:
        return <Step5Personalize {...commonProps} />;
      case 6:
        return (
          <Step6Auth
            onContinue={handleComplete}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );
      default:
        return null;
    }
  };

  return (
    <OnboardingShell
      currentStep={currentStep}
      totalSteps={TOTAL_STEPS}
      onBack={currentStep > 1 ? handleBack : undefined}
      showBackButton={currentStep > 1}
    >
      <div
        className={`transition-opacity duration-${transitionDuration} ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          transitionDuration: `${transitionDuration}ms`,
        }}
      >
        {renderStep()}
      </div>

      {/* Accessibility: Announce current step to screen readers */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Step {currentStep} of {TOTAL_STEPS}
      </div>
    </OnboardingShell>
  );
}

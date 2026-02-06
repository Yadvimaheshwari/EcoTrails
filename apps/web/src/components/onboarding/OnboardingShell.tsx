/**
 * OnboardingShell Component
 * Layout wrapper for onboarding flow with header and progress
 */

'use client';

import { useRouter } from 'next/navigation';
import { ProgressBar } from './ProgressBar';

interface OnboardingShellProps {
  currentStep: number;
  totalSteps: number;
  children: React.ReactNode;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function OnboardingShell({
  currentStep,
  totalSteps,
  children,
  onBack,
  showBackButton = true,
}: OnboardingShellProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (currentStep > 1) {
      router.back();
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#F6F8F7' }}
    >
      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-6 pb-4 safe-area-top">
        <div className="max-w-2xl mx-auto">
          {/* Top bar: Back button + Logo */}
          <div className="flex items-center justify-between mb-4">
            {showBackButton && currentStep > 1 ? (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Go back"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            ) : (
              <div className="w-10" />
            )}

            {/* Logo */}
            <div className="flex-1 flex justify-center">
              <h1 className="text-xl font-medium" style={{ color: '#0F3D2E' }}>
                EcoTrails
              </h1>
            </div>

            <div className="w-10" />
          </div>

          {/* Progress bar */}
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col px-4 py-6 safe-area-bottom">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * OnboardingNav Component
 * Navigation controls for onboarding flow
 */

'use client';

interface OnboardingNavProps {
  onBack?: () => void;
  onContinue: () => void;
  onSkip?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  showBack?: boolean;
  showSkip?: boolean;
}

export function OnboardingNav({
  onBack,
  onContinue,
  onSkip,
  continueLabel = 'Continue',
  continueDisabled = false,
  showBack = true,
  showSkip = false,
}: OnboardingNavProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Primary CTA */}
      <button
        onClick={onContinue}
        disabled={continueDisabled}
        className="w-full py-4 px-6 rounded-full font-medium text-white text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        style={{
          backgroundColor: '#4F8A6B',
          backgroundImage: 'linear-gradient(to bottom, #4F8A6B, #0F3D2E)',
          minHeight: '56px',
        }}
      >
        {continueLabel}
      </button>

      {/* Secondary actions */}
      <div className="flex items-center justify-between">
        {showBack && onBack ? (
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}

        {showSkip && onSkip && (
          <button
            onClick={onSkip}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

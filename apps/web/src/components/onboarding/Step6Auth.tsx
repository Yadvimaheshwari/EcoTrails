/**
 * Step 6: Account Creation (Delayed)
 * Offers authentication options with skip ability
 */

'use client';

import { OnboardingNav } from './OnboardingNav';

interface Step6AuthProps {
  onContinue: (authMethod?: string) => void;
  onBack: () => void;
  onSkip: () => void;
}

export function Step6Auth({ onContinue, onBack, onSkip }: Step6AuthProps) {
  const authOptions = [
    {
      id: 'google',
      label: 'Continue with Google',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      ),
      bg: '#FFFFFF',
      border: '#E8E8E3',
    },
    {
      id: 'apple',
      label: 'Continue with Apple',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
      ),
      bg: '#000000',
      textColor: '#FFFFFF',
      border: '#000000',
    },
    {
      id: 'email',
      label: 'Continue with email',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      bg: '#FFFFFF',
      border: '#E8E8E3',
    },
  ];

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Content */}
      <div className="flex-1">
        {/* Headline */}
        <h2
          className="text-3xl md:text-4xl font-light mb-3 leading-tight"
          style={{ color: '#1B1F1E' }}
        >
          Save your hikes and discoveries
        </h2>

        {/* Subtext */}
        <p className="text-base text-gray-600 mb-8">
          Create an account to keep your journal, track progress, and sync
          across devices.
        </p>

        {/* Benefits */}
        <div
          className="p-4 rounded-2xl mb-8"
          style={{ backgroundColor: '#F0F9F4', border: '1px solid #4F8A6B20' }}
        >
          <div className="space-y-3">
            {[
              'Save your hiking journal forever',
              'Sync across all your devices',
              'Track achievements and milestones',
              'Share trails with friends',
            ].map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#4F8A6B' }}
                >
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auth options */}
        <div className="space-y-3">
          {authOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => onContinue(option.id)}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-medium transition-all active:scale-[0.98]"
              style={{
                backgroundColor: option.bg,
                border: `1px solid ${option.border}`,
                color: option.textColor || '#1B1F1E',
                minHeight: '56px',
              }}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        {/* Skip option */}
        <div className="mt-6 text-center">
          <button
            onClick={onSkip}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Skip for now
          </button>
          <p className="text-xs text-gray-400 mt-2">
            You can create an account later in settings
          </p>
        </div>
      </div>

      {/* Back button only */}
      <div className="mt-8">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

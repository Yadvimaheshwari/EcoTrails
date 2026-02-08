/**
 * Step 1: Purpose - Value First
 * Introduces EcoTrails' core value proposition
 */

'use client';

import { OnboardingNav } from './OnboardingNav';

interface Step1PurposeProps {
  onContinue: () => void;
}

export function Step1Purpose({ onContinue }: Step1PurposeProps) {
  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Content */}
      <div className="flex-1 flex flex-col justify-center">
        {/* Topo texture visual */}
        <div
          className="w-full h-48 rounded-3xl mb-8 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #4F8A6B 0%, #0F3D2E 100%)',
            backgroundImage: `
              linear-gradient(135deg, #4F8A6B 0%, #0F3D2E 100%),
              url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFFFFF' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
            `,
          }}
        >
          <span className="text-6xl">🏔️</span>
        </div>

        {/* Headline */}
        <h2
          className="text-4xl md:text-5xl font-light mb-4 leading-tight"
          style={{ color: '#1B1F1E' }}
        >
          Hike with meaning
        </h2>

        {/* Subtext */}
        <p className="text-lg text-gray-600 leading-relaxed mb-6">
          EcoTrails helps you explore trails, stay safe, and turn every hike
          into a lasting record.
        </p>

        {/* Value points */}
        <div className="space-y-3 mb-8">
          {[
            'Automatic tracking & insights',
            'Offline maps & safety features',
            'AI-powered trail discoveries',
          ].map((point, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#4F8A6B20' }}
              >
                <svg className="w-4 h-4" style={{ color: '#4F8A6B' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-gray-700">{point}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <OnboardingNav
        onContinue={onContinue}
        showBack={false}
        continueLabel="Get started"
      />
    </div>
  );
}

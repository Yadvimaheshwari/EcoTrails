/**
 * Step 2: What EcoTrails Tracks
 * Shows the metrics tracked automatically
 */

'use client';

import { OnboardingNav } from './OnboardingNav';

interface Step2TracksProps {
  onContinue: () => void;
  onBack: () => void;
}

const metrics = [
  { icon: '🥾', label: 'Trails completed', value: 0, max: 50 },
  { icon: '⛰️', label: 'Elevation gained', value: 0, max: 10000 },
  { icon: '🏞️', label: 'Parks explored', value: 0, max: 20 },
  { icon: '📸', label: 'Discoveries logged', value: 0, max: 100 },
  { icon: '🏆', label: 'Achievements', value: 0, max: 30 },
  { icon: '🗺️', label: 'Miles hiked', value: 0, max: 500 },
];

export function Step2Tracks({ onContinue, onBack }: Step2TracksProps) {
  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Content */}
      <div className="flex-1">
        {/* Headline */}
        <h2
          className="text-3xl md:text-4xl font-light mb-3 leading-tight"
          style={{ color: '#1B1F1E' }}
        >
          Everything that matters on the trail
        </h2>

        {/* Subtext */}
        <p className="text-base text-gray-600 mb-8">
          No manual entry. EcoTrails records this automatically while you hike.
        </p>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {metrics.map((metric, idx) => {
            const progress = (metric.value / metric.max) * 100;
            
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E8E8E3',
                }}
              >
                {/* Progress ring */}
                <div className="relative w-16 h-16 mx-auto mb-3">
                  {/* Background circle */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="#E8E8E3"
                      strokeWidth="4"
                      fill="none"
                    />
                    {/* Progress arc */}
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="#4F8A6B"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${progress * 1.76} ${176 - progress * 1.76}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl">{metric.icon}</span>
                  </div>
                </div>

                {/* Label */}
                <div className="text-center">
                  <div className="text-2xl font-light mb-1" style={{ color: '#1B1F1E' }}>
                    {metric.value}
                  </div>
                  <div className="text-xs text-gray-500 leading-tight">
                    {metric.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <OnboardingNav
        onContinue={onContinue}
        onBack={onBack}
      />
    </div>
  );
}

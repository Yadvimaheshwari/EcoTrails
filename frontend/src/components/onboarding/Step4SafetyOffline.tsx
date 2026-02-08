/**
 * Step 4: Safety & Offline Features
 * Highlights safety and reliability features
 */

'use client';

import { OnboardingNav } from './OnboardingNav';

interface Step4SafetyOfflineProps {
  onContinue: () => void;
  onBack: () => void;
}

const safetyFeatures = [
  {
    icon: '📡',
    title: 'Offline maps and tracking',
    description: 'Download trails and track without signal',
  },
  {
    icon: '🎯',
    title: 'GPS trail guidance',
    description: 'Real-time location and route tracking',
  },
  {
    icon: '🌤️',
    title: 'Weather and terrain awareness',
    description: 'Get alerts for conditions and hazards',
  },
  {
    icon: '⚠️',
    title: 'Off-trail alerts',
    description: 'Know when you\'ve wandered off course',
  },
  {
    icon: '🔋',
    title: 'Low battery mode',
    description: 'Optimize tracking when power is low',
  },
];

export function Step4SafetyOffline({ onContinue, onBack }: Step4SafetyOfflineProps) {
  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Content */}
      <div className="flex-1">
        {/* Headline */}
        <h2
          className="text-3xl md:text-4xl font-light mb-3 leading-tight"
          style={{ color: '#1B1F1E' }}
        >
          Built for real hiking conditions
        </h2>

        {/* Subtext */}
        <p className="text-base text-gray-600 mb-8">
          EcoTrails works even without signal and keeps distractions to a minimum.
        </p>

        {/* Features list */}
        <div className="space-y-4 mb-8">
          {safetyFeatures.map((feature, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-4 rounded-2xl transition-all hover:shadow-sm"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E8E8E3',
              }}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                style={{ backgroundColor: '#4F8A6B10' }}
              >
                {feature.icon}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <h3 className="font-medium text-gray-900 mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {feature.description}
                </p>
              </div>

              {/* Checkmark */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                style={{ backgroundColor: '#4F8A6B' }}
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Reassurance message */}
        <div
          className="p-4 rounded-2xl"
          style={{
            backgroundColor: '#FFF8F0',
            border: '1px solid #F4A34020',
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🛡️</span>
            <div>
              <div className="font-medium text-gray-900 mb-1">
                Your safety comes first
              </div>
              <div className="text-sm text-gray-600">
                EcoTrails runs in the background with minimal battery drain,
                so you can focus on the trail ahead.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8">
        <OnboardingNav
          onContinue={onContinue}
          onBack={onBack}
        />
      </div>
    </div>
  );
}

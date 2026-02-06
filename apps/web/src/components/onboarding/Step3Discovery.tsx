/**
 * Step 3: Discovery & Insights
 * Teases the AI-powered identification feature
 */

'use client';

import { OnboardingNav } from './OnboardingNav';

interface Step3DiscoveryProps {
  onContinue: () => void;
  onBack: () => void;
}

export function Step3Discovery({ onContinue, onBack }: Step3DiscoveryProps) {
  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Content */}
      <div className="flex-1">
        {/* Headline */}
        <h2
          className="text-3xl md:text-4xl font-light mb-3 leading-tight"
          style={{ color: '#1B1F1E' }}
        >
          See what you're walking through
        </h2>

        {/* Subtext */}
        <p className="text-base text-gray-600 mb-8">
          Point your camera at plants, wildlife, or geological features and get
          instant, AI-powered identification.
        </p>

        {/* Camera frame mock */}
        <div className="relative mb-8">
          {/* Frame container */}
          <div
            className="relative aspect-[4/3] rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #E8F4F8 0%, #D4E8D4 100%)',
            }}
          >
            {/* Mock camera viewfinder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-8xl mb-4">🌿</div>
                <div className="text-sm text-gray-500">Camera preview</div>
              </div>
            </div>

            {/* Insight card overlay */}
            <div
              className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl backdrop-blur-md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              }}
            >
              {/* Species name */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🌿</span>
                <h3 className="text-lg font-medium" style={{ color: '#1B1F1E' }}>
                  Mountain Laurel
                </h3>
              </div>

              {/* Confidence badge */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: '#4F8A6B20', color: '#4F8A6B' }}
                >
                  High confidence
                </span>
                <span className="text-xs text-gray-500">Spring bloom · Native species</span>
              </div>

              {/* Quick info */}
              <div className="text-xs text-gray-600">
                Location saved with elevation and GPS coordinates
              </div>
            </div>
          </div>
        </div>

        {/* Feature bullets */}
        <div className="space-y-4">
          {[
            {
              icon: '🔍',
              title: 'Identify wildlife and plants from photos',
              description: 'Powered by Gemini Vision AI',
            },
            {
              icon: '📍',
              title: 'Tag discoveries with location + elevation',
              description: 'Automatic geotagging and metadata',
            },
            {
              icon: '📓',
              title: 'Build a personal field journal',
              description: 'All your discoveries in one place',
            },
          ].map((feature, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                style={{ backgroundColor: '#4F8A6B10' }}
              >
                {feature.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-0.5">
                  {feature.title}
                </div>
                <div className="text-sm text-gray-600">
                  {feature.description}
                </div>
              </div>
            </div>
          ))}
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

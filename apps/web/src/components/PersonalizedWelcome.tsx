/**
 * PersonalizedWelcome Component
 * Example of using onboarding personalization data
 * 
 * This is a sample component showing how to integrate onboarding preferences
 * throughout your app. You can use this as a reference for building other
 * personalized features.
 */

'use client';

import { useOnboarding, getPersonalizedGreeting, HIKING_STYLE_LABELS } from '@/hooks/useOnboarding';

export function PersonalizedWelcome() {
  const { isCompleted, personalization, hasPreferences } = useOnboarding();

  if (!isCompleted || !hasPreferences) {
    return null;
  }

  const greeting = getPersonalizedGreeting(personalization);

  return (
    <div
      className="p-6 rounded-3xl mb-6"
      style={{
        background: 'linear-gradient(135deg, #4F8A6B 0%, #0F3D2E 100%)',
        color: '#FFFFFF',
      }}
    >
      {/* Greeting */}
      <h2 className="text-2xl font-light mb-2">{greeting}</h2>

      {/* Personalization summary */}
      <div className="flex flex-wrap gap-2 mb-4">
        {personalization.hikingStyle.map((style) => (
          <span
            key={style}
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {HIKING_STYLE_LABELS[style] || style}
          </span>
        ))}
      </div>

      {/* Difficulty preferences */}
      {personalization.preferredDifficulty.length > 0 && (
        <div className="text-sm opacity-90">
          Showing trails for:{' '}
          {personalization.preferredDifficulty
            .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
            .join(', ')}
        </div>
      )}
    </div>
  );
}

/**
 * Usage example in explore page:
 * 
 * ```tsx
 * import { PersonalizedWelcome } from '@/components/PersonalizedWelcome';
 * 
 * export default function ExplorePage() {
 *   return (
 *     <div>
 *       <PersonalizedWelcome />
 *       <TrailList />
 *     </div>
 *   );
 * }
 * ```
 */

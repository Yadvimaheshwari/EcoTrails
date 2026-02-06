/**
 * Step 5: Personalization
 * User selects hiking style and difficulty preferences
 */

'use client';

import { useState, useEffect } from 'react';
import { OnboardingNav } from './OnboardingNav';
import { getPersonalization, savePersonalization } from '@/lib/onboardingStorage';

interface Step5PersonalizeProps {
  onContinue: () => void;
  onBack: () => void;
}

const hikingStyles = [
  { id: 'leisure', label: 'Leisure explorer', icon: '🚶' },
  { id: 'weekend', label: 'Weekend hiker', icon: '🥾' },
  { id: 'peak', label: 'Peak chaser', icon: '⛰️' },
  { id: 'collector', label: 'National park collector', icon: '🏞️' },
];

const difficulties = [
  { id: 'easy', label: 'Easy', color: '#4F8A6B' },
  { id: 'moderate', label: 'Moderate', color: '#4A9B9B' },
  { id: 'hard', label: 'Hard', color: '#4C7EF3' },
  { id: 'expert', label: 'Expert', color: '#F4A340' },
];

export function Step5Personalize({ onContinue, onBack }: Step5PersonalizeProps) {
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);

  // Load saved preferences on mount
  useEffect(() => {
    const saved = getPersonalization();
    if (saved.hikingStyle.length > 0) {
      setSelectedStyles(saved.hikingStyle);
    }
    if (saved.preferredDifficulty.length > 0) {
      setSelectedDifficulties(saved.preferredDifficulty);
    }
  }, []);

  const toggleStyle = (styleId: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleId)
        ? prev.filter((id) => id !== styleId)
        : [...prev, styleId].slice(0, 2) // Max 2 selections
    );
  };

  const toggleDifficulty = (difficultyId: string) => {
    setSelectedDifficulties((prev) =>
      prev.includes(difficultyId)
        ? prev.filter((id) => id !== difficultyId)
        : [...prev, difficultyId]
    );
  };

  const handleContinue = () => {
    // Save personalization
    savePersonalization({
      hikingStyle: selectedStyles,
      preferredDifficulty: selectedDifficulties,
    });
    onContinue();
  };

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Content */}
      <div className="flex-1">
        {/* Headline */}
        <h2
          className="text-3xl md:text-4xl font-light mb-3 leading-tight"
          style={{ color: '#1B1F1E' }}
        >
          Your hiking style
        </h2>

        {/* Subtext */}
        <p className="text-base text-gray-600 mb-8">
          Help us personalize trail recommendations just for you.
        </p>

        {/* Hiking style selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What describes you best? (Pick 1–2)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {hikingStyles.map((style) => {
              const isSelected = selectedStyles.includes(style.id);
              
              return (
                <button
                  key={style.id}
                  onClick={() => toggleStyle(style.id)}
                  className="p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: isSelected ? '#4F8A6B10' : '#FFFFFF',
                    border: isSelected ? '2px solid #4F8A6B' : '1px solid #E8E8E3',
                  }}
                >
                  <div className="text-3xl mb-2">{style.icon}</div>
                  <div className="font-medium text-sm text-gray-900">
                    {style.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty preference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Difficulty preferences (Select all that apply)
          </label>
          <div className="flex flex-wrap gap-3">
            {difficulties.map((diff) => {
              const isSelected = selectedDifficulties.includes(diff.id);
              
              return (
                <button
                  key={diff.id}
                  onClick={() => toggleDifficulty(diff.id)}
                  className="px-6 py-3 rounded-full font-medium text-sm transition-all active:scale-[0.95]"
                  style={{
                    backgroundColor: isSelected ? diff.color : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : diff.color,
                    border: `2px solid ${diff.color}`,
                  }}
                >
                  {diff.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional hint */}
        {selectedStyles.length === 0 && selectedDifficulties.length === 0 && (
          <div className="mt-6 text-sm text-gray-500 text-center">
            You can change these preferences anytime in settings
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8">
        <OnboardingNav
          onContinue={handleContinue}
          onBack={onBack}
          continueDisabled={selectedStyles.length === 0 || selectedDifficulties.length === 0}
        />
      </div>
    </div>
  );
}

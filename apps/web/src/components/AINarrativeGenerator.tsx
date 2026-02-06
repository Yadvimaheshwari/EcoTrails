'use client';

import { useState, useEffect } from 'react';
import { generateHikeNarrative, updateJournalEntry } from '@/lib/api';
import { isFeatureEnabled } from '@/lib/featureFlags';
import type { Hike, JournalEntry } from '@/types';

interface AINarrativeGeneratorProps {
  hike: Hike;
  journalEntry: JournalEntry | null;
  onNarrativeGenerated?: (narrative: string) => void;
}

export function AINarrativeGenerator({
  hike,
  journalEntry,
  onNarrativeGenerated,
}: AINarrativeGeneratorProps) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if feature is enabled and hike is completed
  const isEnabled = isFeatureEnabled('AI_JOURNAL_NARRATIVE');
  const isCompleted = hike.status === 'completed';

  // Load existing narrative from journal entry metadata (async, non-blocking)
  useEffect(() => {
    if (!isEnabled || !isCompleted) {
      setIsLoading(false);
      return;
    }

    // Load asynchronously to not block render
    const loadNarrative = async () => {
      // Small delay to ensure page renders first
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const existingNarrative = (journalEntry?.meta_data as any)?.ai_narrative;
      if (existingNarrative) {
        setNarrative(existingNarrative);
      }
      setIsLoading(false);
    };

    loadNarrative();
  }, [isEnabled, isCompleted, journalEntry]);

  const handleGenerate = async () => {
    if (!isEnabled || !isCompleted) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await generateHikeNarrative(hike.id);
      
      if (response.data?.narrative) {
        const generatedNarrative = response.data.narrative;
        setNarrative(generatedNarrative);
        onNarrativeGenerated?.(generatedNarrative);

        // Store in journal entry metadata
        if (journalEntry) {
          const updatedMetadata = {
            ...(journalEntry.meta_data || {}),
            ai_narrative: generatedNarrative,
            ai_narrative_generated_at: new Date().toISOString(),
          };
          
          await updateJournalEntry(journalEntry.id, {
            metadata: updatedMetadata,
          });
        }
      } else {
        setError('Failed to generate narrative. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to generate narrative:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to generate narrative');
    } finally {
      setIsGenerating(false);
    }
  };

  // Don't render if feature is disabled or hike is not completed
  if (!isEnabled || !isCompleted) {
    return null;
  }

  // Show loading state only on initial load
  if (isLoading) {
    return null; // Don't block render
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-light text-text">AI Journal Narrative</h3>
        {!narrative && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#4F8A6B' }}
          >
            {isGenerating ? 'Generating...' : '✨ Generate Narrative'}
          </button>
        )}
        {narrative && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3', color: '#5F6F6A' }}
          >
            {isGenerating ? 'Regenerating...' : '🔄 Regenerate'}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FFF8F0', border: '1px solid #F4A34040' }}>
          <div className="text-sm text-textSecondary">{error}</div>
        </div>
      )}

      {isGenerating && (
        <div className="p-4 rounded-2xl" style={{ backgroundColor: '#E8F4F8', border: '1px solid #4C7EF340' }}>
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: '#4C7EF3' }}></div>
            <div className="text-sm text-textSecondary">Generating your hike narrative...</div>
          </div>
        </div>
      )}

      {narrative && !isGenerating && (
        <div className="p-6 rounded-2xl" style={{ backgroundColor: '#E8F4F8', border: '1px solid #4C7EF340' }}>
          <div className="text-sm font-medium text-text mb-3">Your Hike Story</div>
          <div className="text-sm text-textSecondary whitespace-pre-wrap leading-relaxed">
            {narrative}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * PostHikeSummary Component
 * Shows hike completion summary with option to add reflection notes
 * Automatically saves to journal
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PostHikeSummaryProps {
  isOpen: boolean;
  trailName?: string;
  placeName?: string;
  distance: number;
  timeElapsed: number; // seconds
  elevationGain: number;
  discoveries: number;
  notes: number;
  onSaveToJournal: (reflection?: string) => Promise<void>;
  onClose?: () => void;
}

export function PostHikeSummary({
  isOpen,
  trailName,
  placeName,
  distance,
  timeElapsed,
  elevationGain,
  discoveries,
  notes,
  onSaveToJournal,
  onClose,
}: PostHikeSummaryProps) {
  const router = useRouter();
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveToJournal(reflection || undefined);
      // Navigate to journal after save
      router.push('/journal?celebrate=true');
    } catch (error) {
      console.error('Failed to save to journal:', error);
      alert('Failed to save hike to journal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        style={{ animation: 'scaleIn 0.3s ease-out' }}
      >
        {/* Celebration Header */}
        <div
          className="relative px-6 py-12 text-center"
          style={{
            background: 'linear-gradient(135deg, #4F8A6B 0%, #0F3D2E 100%)',
          }}
        >
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-light text-white mb-2">Hike Completed!</h2>
          {trailName && (
            <p className="text-white/90 text-lg">{trailName}</p>
          )}
          {placeName && !trailName && (
            <p className="text-white/90 text-lg">{placeName}</p>
          )}
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Stats Grid */}
          <div>
            <h3 className="text-sm font-medium text-textSecondary mb-3">Your achievement</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0F9F4', border: '1px solid #4F8A6B20' }}>
                <div className="text-xs text-textSecondary mb-1">Distance</div>
                <div className="text-2xl font-light text-text">{distance.toFixed(2)} mi</div>
              </div>
              
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0F9F4', border: '1px solid #4F8A6B20' }}>
                <div className="text-xs text-textSecondary mb-1">Time</div>
                <div className="text-2xl font-light text-text">{formatTime(timeElapsed)}</div>
              </div>
              
              {elevationGain > 0 && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0F9F4', border: '1px solid #4F8A6B20' }}>
                  <div className="text-xs text-textSecondary mb-1">Elevation</div>
                  <div className="text-2xl font-light text-text">{Math.round(elevationGain)} ft</div>
                </div>
              )}
              
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0F9F4', border: '1px solid #4F8A6B20' }}>
                <div className="text-xs text-textSecondary mb-1">Pace</div>
                <div className="text-2xl font-light text-text">
                  {distance > 0 ? `${(timeElapsed / 60 / distance).toFixed(0)} min/mi` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Discoveries & Notes */}
          {(discoveries > 0 || notes > 0) && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#FAFAF8' }}>
              <div className="flex items-center justify-around text-center">
                {discoveries > 0 && (
                  <div>
                    <div className="text-3xl mb-1">📸</div>
                    <div className="text-lg font-medium text-text">{discoveries}</div>
                    <div className="text-xs text-textSecondary">
                      {discoveries === 1 ? 'Discovery' : 'Discoveries'}
                    </div>
                  </div>
                )}
                {notes > 0 && (
                  <div>
                    <div className="text-3xl mb-1">🎙️</div>
                    <div className="text-lg font-medium text-text">{notes}</div>
                    <div className="text-xs text-textSecondary">
                      {notes === 1 ? 'Note' : 'Notes'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reflection Input */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Add a reflection (optional)
            </label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="How was your hike? Any highlights or lessons learned?"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-[#4F8A6B]"
              style={{
                borderColor: '#E8E8E3',
              }}
            />
          </div>

          {/* Motivational Message */}
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#FFF8F0' }}>
            <p className="text-sm text-text">
              🌟 Great job completing this hike! Your discoveries and progress have been saved to your journal.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t" style={{ borderColor: '#E8E8E3' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-6 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50"
            style={{
              backgroundColor: '#4F8A6B',
              backgroundImage: 'linear-gradient(to bottom, #4F8A6B, #0F3D2E)',
            }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Saving to journal...
              </span>
            ) : (
              'Save to journal'
            )}
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="w-full mt-3 px-6 py-2 text-sm text-textSecondary hover:text-text transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * HikeSummaryView Component
 * Post-hike summary showing stats, captured discoveries, and earned badges
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Share2, 
  BookOpen, 
  Trophy, 
  Camera, 
  Clock, 
  TrendingUp,
  Footprints,
  MapPin,
} from 'lucide-react';
import { CapturedDiscovery, DISCOVERY_ICONS } from '@/types/discovery';
import { Badge, BADGE_LEVEL_COLORS } from '@/types/badge';

interface HikeSummaryViewProps {
  isOpen: boolean;
  trailName: string;
  parkName?: string;
  distance: number; // miles
  timeElapsed: number; // seconds
  elevationGain: number; // feet
  capturedDiscoveries: CapturedDiscovery[];
  earnedBadges: Badge[];
  onSaveToJournal: (reflection?: string) => Promise<void>;
  onShare?: () => void;
  onClose: () => void;
}

export function HikeSummaryView({
  isOpen,
  trailName,
  parkName,
  distance,
  timeElapsed,
  elevationGain,
  capturedDiscoveries,
  earnedBadges,
  onSaveToJournal,
  onShare,
  onClose,
}: HikeSummaryViewProps) {
  const router = useRouter();
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  const pace = distance > 0 ? timeElapsed / 60 / distance : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveToJournal(reflection.trim() || undefined);
      router.push('/journal?celebrate=true');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save to journal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
        style={{ animation: 'scaleIn 0.3s ease-out' }}
      >
        {/* Celebration Header */}
        <div
          className="relative px-6 py-10 text-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #4F8A6B 0%, #0F3D2E 100%)',
          }}
        >
          {/* Confetti particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6'][i % 4],
                  left: `${Math.random() * 100}%`,
                  top: `${-10 + Math.random() * 20}%`,
                  animation: `confettiFall ${2 + Math.random() * 2}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          <div className="relative">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-white mb-2">Hike Complete!</h1>
            <p className="text-white/90">{trailName}</p>
            {parkName && (
              <p className="text-white/70 text-sm flex items-center justify-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {parkName}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 300px)' }}>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <Footprints className="w-5 h-5 text-emerald-600 mb-2" />
              <p className="text-2xl font-bold text-slate-800">{distance.toFixed(2)}</p>
              <p className="text-xs text-slate-500">miles</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <Clock className="w-5 h-5 text-emerald-600 mb-2" />
              <p className="text-2xl font-bold text-slate-800">{formatTime(timeElapsed)}</p>
              <p className="text-xs text-slate-500">duration</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <TrendingUp className="w-5 h-5 text-emerald-600 mb-2" />
              <p className="text-2xl font-bold text-slate-800">{Math.round(elevationGain)}</p>
              <p className="text-xs text-slate-500">ft elevation</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <span className="text-xl mb-2 block">👟</span>
              <p className="text-2xl font-bold text-slate-800">
                {pace > 0 ? `${pace.toFixed(0)}` : '—'}
              </p>
              <p className="text-xs text-slate-500">min/mile pace</p>
            </div>
          </div>

          {/* Discoveries Section */}
          {capturedDiscoveries.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Discoveries Captured ({capturedDiscoveries.length})
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {capturedDiscoveries.slice(0, 6).map((discovery) => (
                  <div
                    key={discovery.id}
                    className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center relative overflow-hidden"
                  >
                    {discovery.photoUrl ? (
                      <img
                        src={discovery.photoUrl}
                        alt="Discovery"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">📸</span>
                    )}
                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-sm">✓</span>
                    </div>
                  </div>
                ))}
                {capturedDiscoveries.length > 6 && (
                  <div className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-medium text-slate-600">
                      +{capturedDiscoveries.length - 6}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Badges Section */}
          {earnedBadges.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Badges Earned ({earnedBadges.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {earnedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{
                      backgroundColor: `${BADGE_LEVEL_COLORS[badge.level]}15`,
                      border: `1px solid ${BADGE_LEVEL_COLORS[badge.level]}30`,
                    }}
                  >
                    <span className="text-xl">{badge.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{badge.name}</p>
                      <p
                        className="text-xs capitalize"
                        style={{ color: BADGE_LEVEL_COLORS[badge.level] }}
                      >
                        {badge.level}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reflection Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Add a reflection (optional)
            </label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="How was your hike? Any memorable moments?"
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Achievement Message */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-center">
            <p className="text-sm text-amber-800">
              🌟 Great job completing this hike! Your adventure has been saved.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-100">
          <div className="flex gap-3">
            {onShare && (
              <button
                onClick={onShare}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold transition-all hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <BookOpen className="w-5 h-5" />
                  Save to Journal
                </>
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

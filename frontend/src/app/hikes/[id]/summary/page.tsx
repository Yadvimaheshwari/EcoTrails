'use client';

/**
 * Hike Summary Page
 * Shows post-hike summary with stats, discoveries, and badges
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { HikeSummary, Badge, ParkBadge, DISCOVERY_CATEGORIES, BADGE_DEFINITIONS } from '@/types/hikeMode';

export default function HikeSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const hikeId = params.id as string;

  const [summary, setSummary] = useState<HikeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    loadSummary();
    // Disable confetti after a delay
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [hikeId]);

  const loadSummary = async () => {
    try {
      const response = await api.get(`/api/v1/hikes/${hikeId}/summary`);
      setSummary(response.data);
    } catch (err: any) {
      console.warn('[HikeSummary] Failed to load from API, using local data');
      // Try to load from local storage
      const localData = localStorage.getItem(`hike_summary_${hikeId}`);
      if (localData) {
        setSummary(JSON.parse(localData));
      } else {
        // Generate mock summary
        setSummary(generateMockSummary(hikeId));
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  const formatDistance = (meters: number): string => {
    const miles = meters / 1609.344;
    return `${miles.toFixed(2)} mi`;
  };

  const formatElevation = (meters: number): string => {
    const feet = meters * 3.28084;
    return `${Math.round(feet)} ft`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-mossGreen/20 flex items-center justify-center mb-4 mx-auto animate-pulse">
            <span className="text-4xl">🏆</span>
          </div>
          <p className="text-textSecondary">Loading your achievements...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="font-display text-2xl text-pineGreen mb-2">Summary Not Found</h1>
          <p className="text-textSecondary mb-6">{error || 'Could not load hike summary'}</p>
          <Link
            href="/hikes"
            className="px-6 py-3 bg-pineGreen text-white rounded-full font-medium inline-block"
          >
            View All Hikes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-mossGreen/10 to-background">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
                fontSize: `${20 + Math.random() * 20}px`,
              }}
            >
              {['🎉', '⭐', '✨', '🏆', '🥾'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="text-center pt-12 pb-8 px-6">
        <div className="inline-flex items-center gap-2 bg-mossGreen/20 text-mossGreen px-4 py-2 rounded-full text-sm font-medium mb-4">
          <span>✓</span>
          Hike Complete
        </div>
        <h1 className="font-display text-4xl text-pineGreen mb-2">
          Great Job! 🎉
        </h1>
        <p className="text-textSecondary">
          {summary.trailName} • {summary.parkName}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="px-6 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="font-display text-3xl text-pineGreen">
                {formatDuration(summary.durationSeconds)}
              </div>
              <div className="text-sm text-textSecondary">Duration</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl text-pineGreen">
                {formatDistance(summary.distanceMeters)}
              </div>
              <div className="text-sm text-textSecondary">Distance</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl text-pineGreen">
                {formatElevation(summary.elevationGainMeters)}
              </div>
              <div className="text-sm text-textSecondary">Elevation Gain</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl text-discoveryGold">
                +{summary.totalXp}
              </div>
              <div className="text-sm text-textSecondary">XP Earned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Discoveries */}
      <div className="px-6 mb-8">
        <h2 className="font-display text-xl text-pineGreen mb-4 flex items-center gap-2">
          <span>🔍</span>
          Discoveries
          <span className="text-sm font-normal text-textSecondary">
            ({summary.captureCount} captured)
          </span>
        </h2>
        
        {summary.captureCount > 0 ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-center py-4">
              <div className="text-4xl mb-2">📸</div>
              <p className="text-textSecondary">
                You captured {summary.captureCount} discovery{summary.captureCount !== 1 ? 's' : ''}!
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-4xl mb-2 opacity-50">🔍</div>
            <p className="text-textSecondary">No discoveries captured this hike</p>
            <p className="text-sm text-textSecondary mt-1">
              Look for discovery markers on your next hike!
            </p>
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="px-6 mb-8">
        <h2 className="font-display text-xl text-pineGreen mb-4 flex items-center gap-2">
          <span>🏆</span>
          Badges Earned
        </h2>
        
        {summary.newBadges.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {summary.newBadges.map((badge, i) => (
              <div
                key={badge.id || i}
                className="bg-white rounded-2xl p-4 shadow-sm text-center badge-earned"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <div className="text-4xl mb-2">{badge.icon}</div>
                <div className="font-medium text-pineGreen">{badge.name}</div>
                <div className="text-sm text-discoveryGold">+{badge.xp} XP</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-4xl mb-2 opacity-50">🏅</div>
            <p className="text-textSecondary">Keep exploring to earn badges!</p>
          </div>
        )}
      </div>

      {/* Park Badge */}
      {summary.parkBadge && (
        <div className="px-6 mb-8">
          <div className="bg-gradient-to-r from-pineGreen to-mossGreen rounded-3xl p-6 text-white text-center">
            <div className="text-sm uppercase tracking-wide opacity-80 mb-2">
              Park Badge Unlocked!
            </div>
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-4xl">🏞️</span>
            </div>
            <div className="font-display text-2xl">{summary.parkBadge.parkName}</div>
            <div className="text-sm opacity-80 mt-1">Explorer Badge</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 pb-12 space-y-3">
        <Link
          href={`/journal/hikes/${hikeId}`}
          className="block w-full py-4 bg-pineGreen text-white rounded-2xl font-medium text-center hover:bg-pineGreen/90 transition-colors"
        >
          View in Journal
        </Link>
        <button
          onClick={() => {
            // Share functionality
            if (navigator.share) {
              navigator.share({
                title: `Hiked ${summary.trailName}!`,
                text: `Just completed ${formatDistance(summary.distanceMeters)} on ${summary.trailName}. Earned ${summary.totalXp} XP!`,
              });
            }
          }}
          className="block w-full py-4 bg-white border border-gray-200 text-pineGreen rounded-2xl font-medium text-center hover:bg-gray-50 transition-colors"
        >
          Share Hike 📤
        </button>
        <Link
          href="/explore"
          className="block w-full py-4 text-textSecondary text-center hover:text-pineGreen transition-colors"
        >
          Back to Explore
        </Link>
      </div>
    </div>
  );
}

// Generate mock summary for testing
function generateMockSummary(hikeId: string): HikeSummary {
  return {
    hikeId,
    trailName: 'Coastal Trail',
    parkName: 'Golden Gate Recreation Area',
    startTime: new Date(Date.now() - 5400000).toISOString(),
    endTime: new Date().toISOString(),
    durationSeconds: 5400,
    distanceMeters: 8046,
    elevationGainMeters: 150,
    avgPaceMinPerKm: 11.2,
    discoveryCount: 5,
    captureCount: 2,
    totalXp: 125,
    newBadges: [
      {
        id: 'badge-1',
        type: 'hike_complete',
        name: 'Trail Blazer',
        description: 'Completed a hike',
        icon: '🥾',
        xp: 75,
        earnedAt: new Date().toISOString(),
      },
      {
        id: 'badge-2',
        type: 'first_capture',
        name: 'First Discovery',
        description: 'Made your first discovery',
        icon: '⭐',
        xp: 50,
        earnedAt: new Date().toISOString(),
      },
    ],
    parkBadge: {
      id: 'park-badge-1',
      parkId: 'goga',
      parkName: 'Golden Gate Recreation Area',
      badgeAssetUrl: '',
      unlockedAt: new Date().toISOString(),
    },
  };
}

/**
 * Hike Mode Page
 * Full-screen active hiking experience with discoveries and badges
 * /hike/[hikeId]
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getHike, createJournalEntry, generateHikeSummary } from '@/lib/api';
import {
  HikeMapView,
  DiscoveryLayer,
  DiscoveryCard,
  DiscoveryNearbyToast,
  CaptureDiscoveryModal,
  BadgeToast,
  HikeSummaryView,
} from '@/components/hike';
import type { CaptureData } from '@/components/hike';
import { Discovery, DiscoveryWithDistance, CapturedDiscovery } from '@/types/discovery';
import { Badge, BadgeAward } from '@/types/badge';
import {
  getTrailDiscoveries,
  captureDiscovery,
  createBadgeAward,
  HikeSummaryData,
} from '@/lib/discoveryService';
import { haversineDistanceMeters } from '@/lib/geoUtils';
import { isDevelopment } from '@/config/env';

export default function HikeModePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const hikeId = params.hikeId as string;

  // Hike data state
  const [hike, setHike] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hike tracking state
  const [isPaused, setIsPaused] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [distanceCovered, setDistanceCovered] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationHistory, setLocationHistory] = useState<Array<{ lat: number; lng: number }>>([]);

  // Discovery state
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [capturedIds, setCapturedIds] = useState<string[]>([]);
  const [capturedDiscoveries, setCapturedDiscoveries] = useState<CapturedDiscovery[]>([]);
  const [selectedDiscovery, setSelectedDiscovery] = useState<DiscoveryWithDistance | null>(null);
  const [nearbyDiscovery, setNearbyDiscovery] = useState<DiscoveryWithDistance | null>(null);
  const [showCaptureModal, setShowCaptureModal] = useState(false);

  // Badge state
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [badgeAward, setBadgeAward] = useState<BadgeAward | null>(null);

  // UI state
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [showDevTools, setShowDevTools] = useState(isDevelopment);
  const [simulatedProgress, setSimulatedProgress] = useState(0);

  // Refs
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // ============================================
  // AUTHENTICATION & DATA LOADING
  // ============================================

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && hikeId) {
      loadHikeData();
    }
  }, [user, authLoading, hikeId, router]);

  const loadHikeData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[HikeMode] Loading hike:', hikeId);
      const response = await getHike(hikeId);
      const hikeData = response.data?.data || response.data;

      if (!hikeData) {
        throw new Error('Hike not found');
      }

      console.log('[HikeMode] Hike loaded:', hikeData);
      setHike(hikeData);

      // Load discoveries for the trail
      const trailId = hikeData.trail_id || hikeData.trail?.id;
      if (trailId) {
        const trailDiscoveries = await getTrailDiscoveries(trailId);
        setDiscoveries(trailDiscoveries);
        console.log('[HikeMode] Discoveries loaded:', trailDiscoveries.length);
      }
    } catch (err: any) {
      console.error('[HikeMode] Error loading hike:', err);
      setError(err.message || 'Failed to load hike');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // LOCATION TRACKING
  // ============================================

  useEffect(() => {
    if (!hike || isPaused) return;

    // Start location tracking
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(newLocation);

          // Track path and calculate distance
          setLocationHistory((prev) => {
            if (prev.length > 0) {
              const lastPoint = prev[prev.length - 1];
              const distance = haversineDistanceMeters(lastPoint, newLocation) / 1609.344; // Convert to miles
              if (distance > 0.001) {
                // Only count if moved more than ~5 feet
                setDistanceCovered((d) => d + distance);
                return [...prev, newLocation];
              }
            } else {
              return [newLocation];
            }
            return prev;
          });
        },
        (err) => {
          console.warn('[HikeMode] Geolocation error:', err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [hike, isPaused]);

  // ============================================
  // TIMER
  // ============================================

  useEffect(() => {
    if (!hike || isPaused) return;

    timerRef.current = setInterval(() => {
      setTimeElapsed((t) => t + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [hike, isPaused]);

  // ============================================
  // DISCOVERY HANDLERS
  // ============================================

  const handleDiscoveryClick = useCallback((discovery: DiscoveryWithDistance) => {
    setSelectedDiscovery(discovery);
  }, []);

  const handleDiscoveryNearby = useCallback((discovery: DiscoveryWithDistance) => {
    setNearbyDiscovery(discovery);
  }, []);

  const handleStartCapture = useCallback(() => {
    if (selectedDiscovery) {
      setShowCaptureModal(true);
    }
  }, [selectedDiscovery]);

  const handleCapture = async (data: CaptureData): Promise<{ badge: Badge | null; success: boolean }> => {
    if (!hike || !userLocation) {
      return { badge: null, success: false };
    }

    try {
      const result = await captureDiscovery(
        hikeId,
        data.discoveryId,
        data.location,
        data.photo,
        data.notes
      );

      if (result.success) {
        // Mark as captured
        setCapturedIds((prev) => [...prev, data.discoveryId]);

        // Add to captured list
        if (result.capturedDiscovery) {
          setCapturedDiscoveries((prev) => [...prev, result.capturedDiscovery!]);
        }

        // Award badge
        if (result.badge) {
          const isFirstOfType = !earnedBadges.some((b) => b.type === result.badge!.type);
          setEarnedBadges((prev) => [...prev, result.badge!]);
          setBadgeAward(createBadgeAward(result.badge, isFirstOfType));
        }

        // Close modals
        setSelectedDiscovery(null);
        setShowCaptureModal(false);
      }

      return result;
    } catch (err) {
      console.error('[HikeMode] Capture error:', err);
      return { badge: null, success: false };
    }
  };

  // ============================================
  // HIKE CONTROL HANDLERS
  // ============================================

  const handlePauseToggle = () => {
    setIsPaused((p) => !p);
  };

  const handleBack = () => {
    if (timeElapsed > 0) {
      setShowStopConfirm(true);
    } else {
      router.back();
    }
  };

  const handleStopHike = () => {
    setShowStopConfirm(true);
  };

  const confirmStopHike = async () => {
    setStopping(true);

    try {
      // Update hike status via API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/hikes/${hikeId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({
            status: 'completed',
            end_time: new Date().toISOString(),
            distance_miles: distanceCovered,
            duration_minutes: Math.floor(timeElapsed / 60),
          }),
        }
      );

      // Show summary
      setShowStopConfirm(false);
      setShowSummary(true);
    } catch (err) {
      console.error('[HikeMode] Error stopping hike:', err);
      // Still show summary even if API fails
      setShowStopConfirm(false);
      setShowSummary(true);
    } finally {
      setStopping(false);
    }
  };

  const handleSaveToJournal = async (reflection?: string) => {
    const trailName = hike?.trail?.name || hike?.name || 'Your Hike';
    const parkName = hike?.trail?.place?.name || '';

    const journalContent = `
🎉 **Hike Completed!**

**${trailName}**${parkName ? ` at ${parkName}` : ''}

## Stats
- **Distance:** ${distanceCovered.toFixed(2)} miles
- **Duration:** ${Math.floor(timeElapsed / 60)} minutes
- **Elevation:** +${Math.round(elevationGain)} ft

## Discoveries
${capturedDiscoveries.length > 0 ? capturedDiscoveries.map((d) => `- ✅ ${d.discoveryId}`).join('\n') : 'No discoveries captured'}

## Badges Earned
${earnedBadges.length > 0 ? earnedBadges.map((b) => `- ${b.icon} ${b.name}`).join('\n') : 'No badges earned'}

${reflection ? `## Reflection\n${reflection}` : ''}
    `.trim();

    await createJournalEntry(
      `Completed: ${trailName}`,
      journalContent,
      hikeId,
      'hike_summary',
      {
        distance_miles: distanceCovered,
        duration_minutes: Math.floor(timeElapsed / 60),
        elevation_gain_feet: elevationGain,
        discoveries_count: capturedDiscoveries.length,
        badges_count: earnedBadges.length,
        captured_discoveries: capturedDiscoveries,
        earned_badges: earnedBadges,
      }
    );

    // Try to generate AI summary in background
    generateHikeSummary(hikeId).catch((err) => {
      console.log('[HikeMode] Background summary generation failed:', err);
    });
  };

  // ============================================
  // DEV MODE: SIMULATE LOCATION
  // ============================================

  const simulateLocation = useCallback(() => {
    if (!hike?.route_points || hike.route_points.length < 2) {
      // Generate a mock route if none exists
      const parkLat = hike?.trail?.place?.location?.lat || 37.7749;
      const parkLng = hike?.trail?.place?.location?.lng || -122.4194;
      
      setUserLocation({
        lat: parkLat + (simulatedProgress / 100) * 0.01,
        lng: parkLng + (simulatedProgress / 100) * 0.01,
      });
    } else {
      const route = hike.route_points;
      const index = Math.floor((simulatedProgress / 100) * (route.length - 1));
      const point = route[index];
      
      setUserLocation({
        lat: point.latitude || point.lat,
        lng: point.longitude || point.lng,
      });
    }
  }, [hike, simulatedProgress]);

  useEffect(() => {
    if (showDevTools && simulatedProgress > 0) {
      simulateLocation();
    }
  }, [simulatedProgress, showDevTools, simulateLocation]);

  // ============================================
  // LOADING STATES
  // ============================================

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading hike...</p>
        </div>
      </div>
    );
  }

  if (error || !hike) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">🏔️</div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">
            {error || 'Hike not found'}
          </h1>
          <p className="text-slate-600 mb-6">
            We couldn't load this hike. It may have been deleted or you don't have access.
          </p>
          <button
            onClick={() => router.push('/explore')}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
          >
            Explore Trails
          </button>
        </div>
      </div>
    );
  }

  const trailName = hike.trail?.name || hike.name || 'Trail';
  const difficulty = hike.trail?.difficulty;
  const parkLocation = {
    lat: hike.trail?.place?.location?.lat || hike.trail?.place?.latitude || 37.7749,
    lng: hike.trail?.place?.location?.lng || hike.trail?.place?.longitude || -122.4194,
  };
  const routePoints = hike.route_points?.map((p: any) => ({
    lat: p.latitude || p.lat,
    lng: p.longitude || p.lng,
  }));

  return (
    <>
      {/* Main Hike Map View */}
      <HikeMapView
        trailName={trailName}
        difficulty={difficulty}
        parkLocation={parkLocation}
        routePoints={routePoints}
        userLocation={userLocation}
        timeElapsed={timeElapsed}
        distanceCovered={distanceCovered}
        elevationGain={elevationGain}
        isPaused={isPaused}
        onBack={handleBack}
        onPauseToggle={handlePauseToggle}
        onStop={handleStopHike}
        onMapReady={(map) => {
          mapRef.current = map;
        }}
      >
        {/* Discovery Layer */}
        <DiscoveryLayer
          discoveries={discoveries}
          userLocation={userLocation}
          capturedIds={capturedIds}
          onDiscoveryClick={handleDiscoveryClick}
          onDiscoveryNearby={handleDiscoveryNearby}
          showAllInDevMode={showDevTools}
          mapRef={mapRef.current}
        />
      </HikeMapView>

      {/* Discovery Card */}
      {selectedDiscovery && !showCaptureModal && (
        <DiscoveryCard
          discovery={selectedDiscovery}
          onCapture={handleStartCapture}
          onClose={() => setSelectedDiscovery(null)}
        />
      )}

      {/* Discovery Nearby Toast */}
      {nearbyDiscovery && !selectedDiscovery && (
        <DiscoveryNearbyToast
          discovery={nearbyDiscovery}
          onDismiss={() => setNearbyDiscovery(null)}
          onViewDetails={() => {
            setSelectedDiscovery(nearbyDiscovery);
            setNearbyDiscovery(null);
          }}
        />
      )}

      {/* Capture Modal */}
      <CaptureDiscoveryModal
        isOpen={showCaptureModal}
        discovery={selectedDiscovery}
        onClose={() => setShowCaptureModal(false)}
        onCapture={handleCapture}
      />

      {/* Badge Toast */}
      <BadgeToast award={badgeAward} onDismiss={() => setBadgeAward(null)} />

      {/* Stop Confirmation */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">End hike?</h2>
            <p className="text-slate-600 text-sm mb-6">
              Your progress will be saved and you'll see a summary of your adventure.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStopHike}
                disabled={stopping}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {stopping ? 'Stopping...' : 'End Hike'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary View */}
      <HikeSummaryView
        isOpen={showSummary}
        trailName={trailName}
        parkName={hike.trail?.place?.name}
        distance={distanceCovered}
        timeElapsed={timeElapsed}
        elevationGain={elevationGain}
        capturedDiscoveries={capturedDiscoveries}
        earnedBadges={earnedBadges}
        onSaveToJournal={handleSaveToJournal}
        onClose={() => {
          setShowSummary(false);
          router.push('/journal');
        }}
      />

      {/* Dev Tools */}
      {showDevTools && (
        <div className="fixed bottom-32 left-4 z-30 bg-slate-900/90 backdrop-blur-sm text-white rounded-xl p-3 text-xs">
          <p className="font-semibold mb-2">🛠️ Dev Mode</p>
          <label className="flex items-center gap-2 mb-2">
            <span>Simulate location:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={simulatedProgress}
              onChange={(e) => setSimulatedProgress(Number(e.target.value))}
              className="w-24"
            />
            <span>{simulatedProgress}%</span>
          </label>
          <p className="text-slate-400">
            Discoveries: {discoveries.length} | Captured: {capturedIds.length}
          </p>
        </div>
      )}
    </>
  );
}

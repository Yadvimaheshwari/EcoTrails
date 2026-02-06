/**
 * ActiveHikeMode Component
 * Full-screen active hiking interface with map, stats, and controls
 * Optimized for mobile, one-handed use, and outdoor visibility
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { HikeStateMachine, HikeSessionData } from '@/lib/hikeStateMachine';
import { checkOffTrail, getGPSAccuracyStatus, calculatePathDistance, calculateElevationGain } from '@/lib/offTrail';
import { getTrailMap } from '@/lib/api';
import { LeafletOfflineMap } from '@/components/LeafletOfflineMap';

interface ActiveHikeModeProps {
  hikeId: string;
  trailName?: string;
  trailId?: string;
  distance?: number;
  elevationGain?: number;
  routePoints?: Array<{ lat: number; lng: number; elevation?: number }>;
  onEndHike: (summary: HikeSummary) => void;
  onExitMode?: () => void;
}

export interface HikeSummary {
  distance: number;
  timeElapsed: number;
  elevationGain: number;
  discoveries: number;
  notes: number;
}

export function ActiveHikeMode({
  hikeId,
  trailName,
  trailId,
  distance,
  elevationGain,
  routePoints = [],
  onEndHike,
  onExitMode,
}: ActiveHikeModeProps) {
  const router = useRouter();
  const [stateMachine] = useState(() => new HikeStateMachine({
    hikeId,
    trailId,
    trailName,
    state: 'ACTIVE_HIKE',
    startTime: new Date().toISOString(),
  }));
  
  const [session, setSession] = useState<HikeSessionData>(stateMachine.getSession());
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [showElevationProfile, setShowElevationProfile] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [mapType, setMapType] = useState<'topographic' | 'satellite' | 'terrain'>('topographic');
  const [offlineMapData, setOfflineMapData] = useState<any>(null);
  const [loadingMap, setLoadingMap] = useState(false);
  const [lowBattery, setLowBattery] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [discoveries, setDiscoveries] = useState(0);
  const [notes, setNotes] = useState(0);
  const [locationHistory, setLocationHistory] = useState<Array<{ lat: number; lng: number; elevation?: number }>>([]);
  const [autoRecenter, setAutoRecenter] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const watchIdRef = useRef<number | null>(null);

  // Subscribe to state machine updates
  useEffect(() => {
    const unsubscribe = stateMachine.subscribe(setSession);
    return unsubscribe;
  }, [stateMachine]);

  // Start location tracking
  useEffect(() => {
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            elevation: position.coords.altitude ?? undefined,
          };
          
          setCurrentLocation(location);
          stateMachine.updateLocation({ lat: location.lat, lng: location.lng });
          
          // Add to history for distance calculation
          setLocationHistory((prev) => [...prev, {
            lat: location.lat,
            lng: location.lng,
            elevation: location.elevation,
          }]);
        },
        (error) => {
          console.error('Location tracking error:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000,
        }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [stateMachine]);

  // Check battery status
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryStatus = () => {
          setLowBattery(battery.level < 0.2 && !battery.charging);
        };
        
        updateBatteryStatus();
        battery.addEventListener('levelchange', updateBatteryStatus);
        battery.addEventListener('chargingchange', updateBatteryStatus);
        
        return () => {
          battery.removeEventListener('levelchange', updateBatteryStatus);
          battery.removeEventListener('chargingchange', updateBatteryStatus);
        };
      });
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      stateMachine.setOfflineMode(false);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      stateMachine.setOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [stateMachine]);

  // Load offline map
  useEffect(() => {
    if (trailId && !offlineMapData && !loadingMap) {
      loadOfflineMap(trailId);
    }
  }, [trailId, offlineMapData, loadingMap]);

  // Calculate distance covered
  useEffect(() => {
    if (locationHistory.length > 1) {
      const dist = calculatePathDistance(locationHistory);
      stateMachine.updateDistance(dist);
    }
  }, [locationHistory, stateMachine]);

  // Calculate elevation gain
  useEffect(() => {
    if (locationHistory.length > 1) {
      const gain = calculateElevationGain(locationHistory);
      stateMachine.updateElevationGain(gain);
    }
  }, [locationHistory, stateMachine]);

  const loadOfflineMap = async (id: string) => {
    setLoadingMap(true);
    try {
      const response = await getTrailMap(id);
      if (response.data?.map_data) {
        setOfflineMapData(response.data.map_data);
      }
    } catch (error) {
      console.error('Failed to load offline map:', error);
    } finally {
      setLoadingMap(false);
    }
  };

  const handlePause = () => {
    if (session.state === 'ACTIVE_HIKE') {
      stateMachine.pauseHike();
    } else if (session.state === 'PAUSED') {
      stateMachine.resumeHike();
    }
  };

  const handleEndHike = () => {
    setShowEndConfirm(true);
  };

  const confirmEndHike = () => {
    stateMachine.endHike();
    
    const summary: HikeSummary = {
      distance: session.distance,
      timeElapsed: Math.floor(stateMachine.getElapsedTime() / 1000),
      elevationGain: session.elevationGain,
      discoveries,
      notes,
    };
    
    onEndHike(summary);
  };

  const handleLogDiscovery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Queue for upload
    stateMachine.addEvent({
      id: `discovery_${Date.now()}`,
      type: 'photo',
      timestamp: new Date().toISOString(),
      data: {
        location: currentLocation,
        fileName: file.name,
      },
      synced: false,
    });

    setDiscoveries((prev) => prev + 1);

    // Show toast
    showToast('📸 Discovery captured');
  };

  const handleVoiceNote = () => {
    stateMachine.addEvent({
      id: `note_${Date.now()}`,
      type: 'note',
      timestamp: new Date().toISOString(),
      data: {
        location: currentLocation,
        type: 'voice',
      },
      synced: false,
    });

    setNotes((prev) => prev + 1);
    showToast('🎙️ Note recorded');
  };

  const handleRecenterMap = () => {
    if (currentLocation) {
      setAutoRecenter(true);
      // In a real implementation, this would trigger map recenter
      showToast('📍 Map centered');
    }
  };

  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      z-index: 1000;
      font-size: 14px;
      backdrop-filter: blur(8px);
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 2000);
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const distanceRemaining = distance ? Math.max(0, distance - session.distance) : null;
  const offTrailCheck = currentLocation && routePoints.length > 0
    ? checkOffTrail(currentLocation, routePoints)
    : null;
  const gpsStatus = getGPSAccuracyStatus(currentLocation?.accuracy);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gray-900">
      {/* Top Status Strip */}
      <div className="flex-shrink-0 bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div>
            <div className="text-xs text-textSecondary">Time</div>
            <div className="text-lg font-semibold text-text">
              {formatTime(stateMachine.getElapsedTime())}
            </div>
          </div>
          
          <div className="h-8 w-px bg-gray-200" />
          
          <div>
            <div className="text-xs text-textSecondary">
              {distanceRemaining !== null ? 'Remaining' : 'Covered'}
            </div>
            <div className="text-lg font-semibold text-text">
              {distanceRemaining !== null
                ? `${distanceRemaining.toFixed(1)} mi`
                : `${session.distance.toFixed(1)} mi`}
            </div>
          </div>
          
          <div className="h-8 w-px bg-gray-200" />
          
          <div className="flex items-center gap-1">
            <span className="text-sm">{gpsStatus.icon}</span>
            <span className="text-xs text-textSecondary">{gpsStatus.message}</span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          {isOffline && (
            <div className="px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: '#FFF8F0', color: '#F4A340' }}>
              📡 Offline
            </div>
          )}
          
          {lowBattery && (
            <div className="px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
              🔋 Low
            </div>
          )}
          
          {session.state === 'PAUSED' && (
            <div className="px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: '#FFF8F0', color: '#F4A340' }}>
              ⏸ Paused
            </div>
          )}
        </div>
      </div>

      {/* Off-Trail Warning */}
      {offTrailCheck?.isOffTrail && (
        <div className="flex-shrink-0 bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            <span className="text-sm text-yellow-800">{offTrailCheck.message}</span>
          </div>
          <button
            onClick={handleRecenterMap}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
          >
            Recenter
          </button>
        </div>
      )}

      {/* Main Map Area */}
      <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: '#E8F4F8' }}>
        {/* Interactive Leaflet map centered on user's real location */}
        <LeafletOfflineMap
          center={
            currentLocation 
              ? { lat: currentLocation.lat, lng: currentLocation.lng }
              : routePoints.length > 0
                ? { lat: routePoints[0].lat, lng: routePoints[0].lng }
                : { lat: 40.0583, lng: -74.4057 } // NJ default, not California
          }
          zoom={15}
          polyline={routePoints}
          currentLocation={currentLocation}
          showUserLocation={true}
          height="100%"
          interactive={true}
          className="w-full h-full"
        />

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2" style={{ zIndex: 1000 }}>
          <button
            onClick={handleRecenterMap}
            className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            title="Recenter map"
          >
            <span className="text-lg">📍</span>
          </button>
          
          <button
            onClick={() => setShowElevationProfile(!showElevationProfile)}
            className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            title="Elevation profile"
          >
            <span className="text-lg">📊</span>
          </button>
        </div>

        {/* Stats Overlay */}
        <div className="absolute bottom-20 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg" style={{ zIndex: 1000 }}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-textSecondary mb-1">Distance</div>
              <div className="text-lg font-semibold text-text">{session.distance.toFixed(2)} mi</div>
            </div>
            <div>
              <div className="text-xs text-textSecondary mb-1">Elevation</div>
              <div className="text-lg font-semibold text-text">{Math.round(session.elevationGain)} ft</div>
            </div>
            <div>
              <div className="text-xs text-textSecondary mb-1">Pace</div>
              <div className="text-lg font-semibold text-text">
                {session.distance > 0 
                  ? `${(stateMachine.getElapsedTime() / 1000 / 60 / session.distance).toFixed(0)} min/mi`
                  : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Dock */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-around shadow-lg">
        <button
          onClick={handleLogDiscovery}
          className="flex flex-col items-center gap-1 p-2 rounded-xl active:scale-95 transition-transform"
        >
          <span className="text-2xl">📸</span>
          <span className="text-xs text-textSecondary">Discovery</span>
        </button>

        <button
          onClick={handleVoiceNote}
          className="flex flex-col items-center gap-1 p-2 rounded-xl active:scale-95 transition-transform"
        >
          <span className="text-2xl">🎙️</span>
          <span className="text-xs text-textSecondary">Voice</span>
        </button>

        <button
          onClick={handlePause}
          className="flex flex-col items-center gap-1 p-2 rounded-xl active:scale-95 transition-transform"
        >
          <span className="text-2xl">{session.state === 'PAUSED' ? '▶️' : '⏸️'}</span>
          <span className="text-xs text-textSecondary">{session.state === 'PAUSED' ? 'Resume' : 'Pause'}</span>
        </button>

        <button
          onClick={handleEndHike}
          className="flex flex-col items-center gap-1 p-2 rounded-xl active:scale-95 transition-transform"
        >
          <span className="text-2xl">⏹️</span>
          <span className="text-xs text-textSecondary">End</span>
        </button>

        {onExitMode && (
          <button
            onClick={onExitMode}
            className="flex flex-col items-center gap-1 p-2 rounded-xl active:scale-95 transition-transform"
          >
            <span className="text-2xl">✕</span>
            <span className="text-xs text-textSecondary">Exit</span>
          </button>
        )}
      </div>

      {/* End Hike Confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-medium text-text mb-4">End hike?</h3>
            
            <div className="space-y-2 mb-6 text-sm text-textSecondary">
              <div className="flex justify-between">
                <span>Time:</span>
                <span className="font-medium text-text">{formatTime(stateMachine.getElapsedTime())}</span>
              </div>
              <div className="flex justify-between">
                <span>Distance:</span>
                <span className="font-medium text-text">{session.distance.toFixed(2)} mi</span>
              </div>
              <div className="flex justify-between">
                <span>Elevation:</span>
                <span className="font-medium text-text">{Math.round(session.elevationGain)} ft</span>
              </div>
              <div className="flex justify-between">
                <span>Discoveries:</span>
                <span className="font-medium text-text">{discoveries}</span>
              </div>
            </div>

            <p className="text-sm text-textSecondary mb-6">
              Your hike will be saved to your journal with all discoveries and notes.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmEndHike}
                className="flex-1 px-4 py-2 rounded-xl text-white transition-all"
                style={{
                  backgroundColor: '#4F8A6B',
                  backgroundImage: 'linear-gradient(to bottom, #4F8A6B, #0F3D2E)',
                }}
              >
                End hike
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageCapture}
        className="hidden"
      />
    </div>
  );
}

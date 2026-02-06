/**
 * HikeMapView Component
 * Full-screen map view for active hike mode with discovery overlay
 * Includes minimal UI controls and stats bar
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChevronLeft,
  Layers,
  Navigation,
  Pause,
  Play,
  Square,
  Compass,
  Plus,
  Minus,
} from 'lucide-react';
import { GOOGLE_MAPS_KEY, hasGoogleMapsKey, isDevelopment } from '@/config/env';

interface HikeMapViewProps {
  trailName: string;
  difficulty?: string;
  parkLocation: { lat: number; lng: number };
  routePoints?: Array<{ lat: number; lng: number }>;
  userLocation: { lat: number; lng: number } | null;
  timeElapsed: number; // seconds
  distanceCovered: number; // miles
  elevationGain: number; // feet
  isPaused: boolean;
  onBack: () => void;
  onPauseToggle: () => void;
  onStop: () => void;
  onMapReady?: (map: google.maps.Map) => void;
  children?: React.ReactNode; // For discovery layer overlay
}

// Difficulty pill colors
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  hard: 'bg-orange-500',
  expert: 'bg-red-500',
  unknown: 'bg-slate-500',
};

export function HikeMapView({
  trailName,
  difficulty,
  parkLocation,
  routePoints,
  userLocation,
  timeElapsed,
  distanceCovered,
  elevationGain,
  isPaused,
  onBack,
  onPauseToggle,
  onStop,
  onMapReady,
  children,
}: HikeMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const pathPolylineRef = useRef<google.maps.Polyline | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'terrain' | 'satellite' | 'roadmap'>('terrain');
  const [followUser, setFollowUser] = useState(true);
  const [userPath, setUserPath] = useState<Array<{ lat: number; lng: number }>>([]);

  // Load Google Maps
  useEffect(() => {
    if (!hasGoogleMapsKey()) {
      setMapError('Map requires configuration');
      return;
    }

    const loadScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (typeof window.google !== 'undefined' && window.google.maps) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps'));
        document.head.appendChild(script);
      });
    };

    loadScript()
      .then(() => {
        if (!mapRef.current || googleMapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: userLocation || parkLocation,
          zoom: 15,
          mapTypeId: mapType,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          gestureHandling: 'greedy',
          styles: [
            {
              featureType: 'poi.park',
              elementType: 'geometry.fill',
              stylers: [{ color: '#c8e6c9' }],
            },
          ],
        });

        googleMapRef.current = map;
        setMapLoaded(true);

        if (onMapReady) {
          onMapReady(map);
        }

        // Draw trail route if available
        if (routePoints && routePoints.length > 1) {
          routePolylineRef.current = new google.maps.Polyline({
            path: routePoints,
            strokeColor: '#4F8A6B',
            strokeOpacity: 0.6,
            strokeWeight: 4,
            map,
          });

          // Fit bounds to route
          const bounds = new google.maps.LatLngBounds();
          routePoints.forEach((point) => bounds.extend(point));
          map.fitBounds(bounds, 50);
        }
      })
      .catch((err) => {
        console.error('[HikeMapView] Error loading map:', err);
        setMapError('Failed to load map');
      });
  }, [parkLocation, onMapReady]);

  // Update map type
  useEffect(() => {
    if (googleMapRef.current && mapLoaded) {
      googleMapRef.current.setMapTypeId(mapType);
    }
  }, [mapType, mapLoaded]);

  // Update user marker and track path
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation) return;

    // Update or create user marker
    if (!userMarkerRef.current) {
      userMarkerRef.current = new google.maps.Marker({
        position: userLocation,
        map: googleMapRef.current,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#3B82F6" stroke="white" stroke-width="3" filter="url(#glow)"/>
              <circle cx="16" cy="16" r="5" fill="white"/>
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#3B82F6" flood-opacity="0.5"/>
                </filter>
              </defs>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        },
        zIndex: 1000,
      });
    } else {
      userMarkerRef.current.setPosition(userLocation);
    }

    // Track user path
    setUserPath((prev) => {
      const newPath = [...prev, userLocation];
      
      // Update path polyline
      if (pathPolylineRef.current) {
        pathPolylineRef.current.setPath(newPath);
      } else if (googleMapRef.current) {
        pathPolylineRef.current = new google.maps.Polyline({
          path: newPath,
          strokeColor: '#3B82F6',
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map: googleMapRef.current,
        });
      }

      return newPath;
    });

    // Follow user if enabled
    if (followUser) {
      googleMapRef.current.panTo(userLocation);
    }
  }, [userLocation, mapLoaded, followUser]);

  // Handle recenter
  const handleRecenter = useCallback(() => {
    if (googleMapRef.current && userLocation) {
      googleMapRef.current.panTo(userLocation);
      googleMapRef.current.setZoom(16);
      setFollowUser(true);
    }
  }, [userLocation]);

  // Cycle map type
  const cycleMapType = () => {
    const types: Array<'terrain' | 'satellite' | 'roadmap'> = ['terrain', 'satellite', 'roadmap'];
    const currentIndex = types.indexOf(mapType);
    setMapType(types[(currentIndex + 1) % types.length]);
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const difficultyKey = difficulty?.toLowerCase() || 'unknown';
  const difficultyColor = DIFFICULTY_COLORS[difficultyKey] || DIFFICULTY_COLORS.unknown;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-900">
      {/* Map Container */}
      <div className="flex-1 relative">
        {/* Map */}
        {mapError ? (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center">
            <div className="text-center px-6">
              <div className="text-4xl mb-4">🗺️</div>
              <p className="text-slate-600 mb-2">{mapError}</p>
              <p className="text-sm text-slate-500">GPS tracking is still active</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full" />
        )}

        {/* Loading Overlay */}
        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-600">Loading map...</p>
            </div>
          </div>
        )}

        {/* Top Bar - Trail Info */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="bg-gradient-to-b from-black/60 to-transparent pt-safe">
            <div className="px-4 py-3 flex items-center gap-3">
              {/* Back Button */}
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-slate-700" />
              </button>

              {/* Trail Name & Difficulty */}
              <div className="flex-1 min-w-0">
                <h1 className="text-white font-semibold truncate text-lg drop-shadow-md">
                  {trailName}
                </h1>
              </div>

              {/* Difficulty Pill */}
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium text-white ${difficultyColor}`}
              >
                {difficulty || 'Unknown'}
              </div>
            </div>
          </div>
        </div>

        {/* Map Controls - Right Side */}
        <div className="absolute top-24 right-4 z-20 flex flex-col gap-2">
          {/* Map Type Toggle */}
          <button
            onClick={cycleMapType}
            className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
            title={`Map: ${mapType}`}
          >
            <Layers className="w-5 h-5 text-slate-700" />
          </button>

          {/* Zoom Controls */}
          <button
            onClick={() => googleMapRef.current?.setZoom((googleMapRef.current.getZoom() || 15) + 1)}
            className="w-10 h-10 bg-white rounded-t-xl shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <Plus className="w-5 h-5 text-slate-700" />
          </button>
          <button
            onClick={() => googleMapRef.current?.setZoom((googleMapRef.current.getZoom() || 15) - 1)}
            className="w-10 h-10 bg-white rounded-b-xl shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors -mt-2"
          >
            <Minus className="w-5 h-5 text-slate-700" />
          </button>

          {/* Recenter */}
          <button
            onClick={handleRecenter}
            className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center transition-colors ${
              followUser ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="Recenter on location"
          >
            <Navigation className="w-5 h-5" />
          </button>
        </div>

        {/* Paused Overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-30">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-8 py-6 text-center shadow-xl">
              <div className="text-4xl mb-2">⏸️</div>
              <p className="text-lg font-semibold text-slate-800">Hike Paused</p>
              <p className="text-sm text-slate-500 mt-1">Tap resume to continue</p>
            </div>
          </div>
        )}

        {/* Discovery Layer Children */}
        {children}
      </div>

      {/* Bottom Stats Bar */}
      <div className="bg-white border-t border-slate-200 shadow-lg">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 px-4 py-3 border-b border-slate-100">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-0.5">Time</p>
            <p className="text-lg font-semibold text-slate-800 tabular-nums">
              {formatTime(timeElapsed)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-0.5">Distance</p>
            <p className="text-lg font-semibold text-slate-800">
              {distanceCovered.toFixed(2)} mi
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-0.5">Elevation</p>
            <p className="text-lg font-semibold text-slate-800">
              +{Math.round(elevationGain)} ft
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-around px-4 py-3 pb-safe">
          {/* Pause/Resume */}
          <button
            onClick={onPauseToggle}
            className="flex flex-col items-center gap-1 p-2"
          >
            {isPaused ? (
              <>
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
                  <Play className="w-6 h-6 text-white ml-0.5" />
                </div>
                <span className="text-xs text-slate-600">Resume</span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-md">
                  <Pause className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-slate-600">Pause</span>
              </>
            )}
          </button>

          {/* Discoveries Button (placeholder for parent to add) */}
          <div className="flex flex-col items-center gap-1 p-2">
            <div className="w-14 h-14 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
              <Compass className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs text-slate-600">Discover</span>
          </div>

          {/* Stop */}
          <button
            onClick={onStop}
            className="flex flex-col items-center gap-1 p-2"
          >
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-md">
              <Square className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-xs text-slate-600">Stop</span>
          </button>
        </div>
      </div>
    </div>
  );
}

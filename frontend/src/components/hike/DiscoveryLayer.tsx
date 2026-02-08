/**
 * DiscoveryLayer Component
 * Renders discovery markers on the map with proximity-based reveal
 * Only shows markers when user is within reveal radius
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Discovery, 
  DiscoveryWithDistance, 
  DISCOVERY_ICONS, 
  DISCOVERY_COLORS,
  DEFAULT_REVEAL_RADIUS_METERS 
} from '@/types/discovery';
import { haversineDistanceMeters, formatDistanceFeet } from '@/lib/geoUtils';

interface DiscoveryLayerProps {
  discoveries: Discovery[];
  userLocation: { lat: number; lng: number } | null;
  capturedIds: string[];
  onDiscoveryClick: (discovery: DiscoveryWithDistance) => void;
  onDiscoveryNearby?: (discovery: DiscoveryWithDistance) => void;
  showAllInDevMode?: boolean;
  mapRef?: google.maps.Map | null;
}

export function DiscoveryLayer({
  discoveries,
  userLocation,
  capturedIds,
  onDiscoveryClick,
  onDiscoveryNearby,
  showAllInDevMode = false,
  mapRef,
}: DiscoveryLayerProps) {
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());

  // Calculate distances and determine which discoveries are revealed
  const discoveriesWithDistance = useMemo((): DiscoveryWithDistance[] => {
    if (!discoveries || discoveries.length === 0) return [];

    return discoveries.map((discovery) => {
      let distanceMeters = Infinity;
      
      if (userLocation) {
        distanceMeters = haversineDistanceMeters(userLocation, {
          lat: discovery.lat,
          lng: discovery.lng,
        });
      }

      const revealRadius = discovery.revealRadiusMeters || DEFAULT_REVEAL_RADIUS_METERS;
      const isRevealed = showAllInDevMode || distanceMeters <= revealRadius;

      return {
        ...discovery,
        distanceMeters,
        isRevealed,
        isCaptured: capturedIds.includes(discovery.id),
      };
    });
  }, [discoveries, userLocation, capturedIds, showAllInDevMode]);

  // Notify when discoveries come into range
  useEffect(() => {
    discoveriesWithDistance.forEach((discovery) => {
      if (
        discovery.isRevealed &&
        !discovery.isCaptured &&
        !notifiedIds.has(discovery.id) &&
        onDiscoveryNearby
      ) {
        onDiscoveryNearby(discovery);
        setNotifiedIds((prev) => new Set([...prev, discovery.id]));
      }
    });
  }, [discoveriesWithDistance, notifiedIds, onDiscoveryNearby]);

  // Render markers on Google Maps
  useEffect(() => {
    if (!mapRef) return;

    // Clear existing markers (in a real implementation, manage markers via refs)
    const markers: google.maps.Marker[] = [];

    discoveriesWithDistance
      .filter((d) => d.isRevealed)
      .forEach((discovery) => {
        const icon = DISCOVERY_ICONS[discovery.type];
        const color = DISCOVERY_COLORS[discovery.type];
        
        const marker = new google.maps.Marker({
          position: { lat: discovery.lat, lng: discovery.lng },
          map: mapRef,
          title: discovery.title,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="16" fill="${discovery.isCaptured ? '#9CA3AF' : color}" stroke="white" stroke-width="3" filter="url(#shadow)"/>
                <text x="20" y="26" text-anchor="middle" font-size="16">${icon}</text>
                <defs>
                  <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
                  </filter>
                </defs>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20),
          },
          animation: discovery.isCaptured ? undefined : google.maps.Animation.DROP,
          opacity: discovery.isCaptured ? 0.6 : 1,
          zIndex: discovery.isCaptured ? 10 : 100,
        });

        marker.addListener('click', () => {
          onDiscoveryClick(discovery);
        });

        markers.push(marker);
      });

    // Cleanup on unmount or when dependencies change
    return () => {
      markers.forEach((marker) => marker.setMap(null));
    };
  }, [mapRef, discoveriesWithDistance, onDiscoveryClick]);

  // Render UI overlay for discoveries (non-Google Maps fallback)
  const revealedDiscoveries = discoveriesWithDistance.filter((d) => d.isRevealed);
  const nearbyCount = revealedDiscoveries.filter((d) => !d.isCaptured).length;
  const capturedCount = revealedDiscoveries.filter((d) => d.isCaptured).length;

  return (
    <>
      {/* Discovery Counter Badge */}
      {revealedDiscoveries.length > 0 && (
        <div className="absolute top-4 left-4 z-30">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🔍</span>
              <span className="text-sm font-medium text-slate-700">
                {nearbyCount} nearby
              </span>
            </div>
            {capturedCount > 0 && (
              <>
                <div className="w-px h-4 bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">✅</span>
                  <span className="text-sm font-medium text-emerald-600">
                    {capturedCount} captured
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Discovery Card Component
 * Shows discovery details when user taps a marker
 */
interface DiscoveryCardProps {
  discovery: DiscoveryWithDistance;
  onCapture: () => void;
  onLearnMore?: () => void;
  onClose: () => void;
}

export function DiscoveryCard({
  discovery,
  onCapture,
  onLearnMore,
  onClose,
}: DiscoveryCardProps) {
  const icon = DISCOVERY_ICONS[discovery.type];
  const color = DISCOVERY_COLORS[discovery.type];
  
  return (
    <div className="absolute bottom-24 left-4 right-4 z-40">
      <div 
        className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Header */}
        <div 
          className="px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: `${color}15` }}
        >
          <span className="text-3xl">{icon}</span>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{discovery.title}</h3>
            <p className="text-xs text-slate-500 capitalize">
              {discovery.type.replace(/_/g, ' ')} • {formatDistanceFeet(discovery.distanceMeters)} away
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/50 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <p className="text-sm text-slate-600 leading-relaxed">
            {discovery.shortText}
          </p>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          {discovery.isCaptured ? (
            <div className="flex-1 py-2.5 px-4 bg-emerald-50 text-emerald-700 rounded-xl text-center font-medium text-sm flex items-center justify-center gap-2">
              <span>✅</span>
              Captured
            </div>
          ) : (
            <button
              onClick={onCapture}
              className="flex-1 py-2.5 px-4 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white rounded-xl font-medium text-sm transition-all hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>📸</span>
              Capture
            </button>
          )}
          
          {onLearnMore && (
            <button
              onClick={onLearnMore}
              className="py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl font-medium text-sm transition-colors hover:bg-slate-50"
            >
              Learn more
            </button>
          )}
        </div>

        {/* Rarity Badge */}
        {discovery.difficulty && discovery.difficulty !== 'common' && (
          <div className="px-4 pb-3">
            <span 
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${color}20`,
                color: color,
              }}
            >
              <span>✨</span>
              {discovery.difficulty.charAt(0).toUpperCase() + discovery.difficulty.slice(1)} find!
            </span>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Discovery Nearby Toast
 * Shows when user enters discovery radius
 */
interface DiscoveryNearbyToastProps {
  discovery: DiscoveryWithDistance;
  onDismiss: () => void;
  onViewDetails: () => void;
}

export function DiscoveryNearbyToast({
  discovery,
  onDismiss,
  onViewDetails,
}: DiscoveryNearbyToastProps) {
  const icon = DISCOVERY_ICONS[discovery.type];

  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div 
      className="fixed bottom-32 left-4 right-4 z-50 pointer-events-none"
      style={{ animation: 'fadeInUp 0.3s ease-out' }}
    >
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl shadow-xl px-4 py-3 pointer-events-auto mx-auto max-w-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <span className="text-xl">{icon}</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Discovery nearby!</p>
            <p className="text-xs text-white/80">{discovery.title}</p>
          </div>
          <button
            onClick={onViewDetails}
            className="px-3 py-1.5 bg-white/20 rounded-lg text-xs font-medium hover:bg-white/30 transition-colors"
          >
            View
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            transform: translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

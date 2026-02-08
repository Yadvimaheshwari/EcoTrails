'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Navigation, Maximize2, Layers, AlertCircle, CheckCircle, Download, ExternalLink } from 'lucide-react';
import { TrailPreviewCard } from './TrailPreviewCard';
import { LeafletOfflineMap } from '@/components/LeafletOfflineMap';
import {
  extractTrailCoordinates,
  getDifficultyColor,
  getBoundsFromCoordinates,
  debounce,
  areCoordinatesValid,
  LatLng,
} from '@/lib/mapUtils';
import { FrontendTrail } from '@/lib/trailTransform';
import { GOOGLE_MAPS_KEY, hasGoogleMapsKey, isDevelopment } from '@/config/env';
import { loadGoogleMaps } from '@/lib/googleMapsLoader';

interface TrailMapProps {
  park: {
    name?: string;
    location: {
      lat: number;
      lng: number;
    };
  };
  trails: FrontendTrail[];
  selectedTrail: FrontendTrail | null;
  hoveredTrailId: string | null;
  onTrailSelect: (trail: FrontendTrail) => void;
  onTrailDeselect: () => void;
  onStartHike: (trail: FrontendTrail) => void;
  /** Hide the floating preview card (used when trail preview is shown inline) */
  hidePreviewCard?: boolean;
}

export function TrailMap({
  park,
  trails,
  selectedTrail,
  hoveredTrailId,
  onTrailSelect,
  onTrailDeselect,
  onStartHike,
  hidePreviewCard = false,
}: TrailMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map());

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'terrain'>('terrain');
  const [showPreview, setShowPreview] = useState(false);
  const hasKey = hasGoogleMapsKey();

  // Show preview when selected trail changes (works for both Google and Leaflet fallback)
  useEffect(() => {
    if (selectedTrail) setShowPreview(true);
  }, [selectedTrail]);

  // Initialize Google Maps
  useEffect(() => {
    if (isDevelopment) {
      console.log('[TrailMap] Checking Google Maps API key...');
      console.log('[TrailMap] Key present:', hasGoogleMapsKey());
    }
    
    if (!hasKey) {
      return;
    }

    loadGoogleMaps(GOOGLE_MAPS_KEY, ['geometry'])
      .then(() => {
        if (isDevelopment) {
          console.log('✅ Google Maps SDK loaded successfully');
        }
        
        if (mapRef.current && !googleMapRef.current) {
          // Extract lat/lng from park.location (handle various formats)
          let center = { lat: 37.7749, lng: -122.4194 }; // Default fallback
          
          if (park.location) {
            if (typeof park.location === 'object') {
              center = {
                lat: park.location.lat || (park.location as any).latitude || 37.7749,
                lng: park.location.lng || (park.location as any).longitude || -122.4194,
              };
            }
          }
          
          const map = new google.maps.Map(mapRef.current, {
            center,
            zoom: 12,
            mapTypeId: mapType,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            zoomControlOptions: {
              position: google.maps.ControlPosition.RIGHT_TOP,
            },
            styles: mapType === 'roadmap' ? [
              {
                featureType: 'poi.park',
                elementType: 'geometry.fill',
                stylers: [{ color: '#c8e6c9' }]
              },
              {
                featureType: 'landscape.natural',
                elementType: 'geometry.fill',
                stylers: [{ color: '#e8f5e9' }]
              }
            ] : undefined,
          });

          googleMapRef.current = map;

          // Add park marker
          new google.maps.Marker({
            position: center,
            map: map,
            title: park.name || 'Park',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="12" fill="#10b981" stroke="white" stroke-width="3"/>
                  <circle cx="20" cy="20" r="5" fill="white"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 20),
            },
          });

          setMapLoaded(true);
        }
      })
      .catch((err) => {
        console.error('[TrailMap] Error loading Google Maps:', err);
        setMapError('Failed to load map');
      });
  }, [park.location, park.name, hasKey]);

  // Update map type when changed
  useEffect(() => {
    if (googleMapRef.current && mapLoaded) {
      googleMapRef.current.setMapTypeId(mapType);
    }
  }, [mapType, mapLoaded]);

  // Render trail polylines
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;

    const map = googleMapRef.current;

    // Clear existing polylines
    polylinesRef.current.forEach((polyline) => polyline.setMap(null));
    polylinesRef.current.clear();

    // Clear existing markers (except park marker)
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Render all trails
    trails.forEach((trail) => {
      const coordinates = extractTrailCoordinates(trail);
      
      if (coordinates && areCoordinatesValid(coordinates)) {
        // Trail has geometry - render polyline
        const isSelected = selectedTrail?.id === trail.id;
        const isHovered = hoveredTrailId === trail.id;
        const color = getDifficultyColor(trail.difficulty);

        const polyline = new google.maps.Polyline({
          path: coordinates,
          strokeColor: color,
          strokeOpacity: isSelected ? 1 : isHovered ? 0.8 : 0.5,
          strokeWeight: isSelected ? 7 : isHovered ? 5 : 3,
          zIndex: isSelected ? 100 : isHovered ? 50 : 10,
          map: map,
          clickable: true,
        });

        // Add click listener
        polyline.addListener('click', () => {
          onTrailSelect(trail);
          setShowPreview(true);
        });

        // Add hover effects
        polyline.addListener('mouseover', () => {
          if (!isSelected) {
            polyline.setOptions({
              strokeOpacity: 0.8,
              strokeWeight: 5,
            });
          }
        });

        polyline.addListener('mouseout', () => {
          if (!isSelected) {
            polyline.setOptions({
              strokeOpacity: 0.5,
              strokeWeight: 3,
            });
          }
        });

        polylinesRef.current.set(trail.id || '', polyline);
      } else {
        // No geometry - render trailhead marker
        const parkLocation = park.location;
        if (parkLocation && typeof parkLocation === 'object') {
          // Offset markers slightly so they don't stack
          const offset = (markersRef.current.length * 0.002);
          const lat = parkLocation.lat + offset;
          const lng = parkLocation.lng + offset;

          const marker = new google.maps.Marker({
            position: { lat, lng },
            map: map,
            title: trail.name,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="${getDifficultyColor(trail.difficulty)}" stroke="white" stroke-width="2"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(24, 24),
              anchor: new google.maps.Point(12, 12),
            },
          });

          marker.addListener('click', () => {
            onTrailSelect(trail);
            setShowPreview(true);
          });

          markersRef.current.push(marker);
        }
      }
    });
  }, [mapLoaded, trails, selectedTrail, hoveredTrailId, onTrailSelect, park.location]);

  // Fit bounds to selected trail
  const fitBoundsToTrail = useCallback(
    debounce((trail: FrontendTrail) => {
      if (!googleMapRef.current) return;

      const coordinates = extractTrailCoordinates(trail);
      if (!coordinates || !areCoordinatesValid(coordinates)) return;

      const bounds = getBoundsFromCoordinates(coordinates);
      if (!bounds) return;

      const googleBounds = new google.maps.LatLngBounds(
        { lat: bounds.south, lng: bounds.west },
        { lat: bounds.north, lng: bounds.east }
      );
      googleMapRef.current.fitBounds(googleBounds, 50);
    }, 300),
    []
  );

  // Handle trail selection changes
  useEffect(() => {
    if (selectedTrail) {
      fitBoundsToTrail(selectedTrail);
      setShowPreview(true);
    } else {
      setShowPreview(false);
    }
  }, [selectedTrail, fitBoundsToTrail]);

  // Locate user
  const handleLocateMe = () => {
    if (!googleMapRef.current) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          googleMapRef.current?.panTo(userLocation);
          googleMapRef.current?.setZoom(15);

          // Add user marker
          new google.maps.Marker({
            position: userLocation,
            map: googleMapRef.current,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#3b82f6" stroke="white" stroke-width="3"/>
                  <circle cx="12" cy="12" r="3" fill="white"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(24, 24),
              anchor: new google.maps.Point(12, 12),
            },
          });
        },
        (error) => {
          console.error('[TrailMap] Geolocation error:', error);
        }
      );
    }
  };

  // Fit bounds to all trails
  const handleFitBounds = () => {
    if (!googleMapRef.current) return;

    const allCoordinates: LatLng[] = [];
    trails.forEach((trail) => {
      const coords = extractTrailCoordinates(trail);
      if (coords && areCoordinatesValid(coords)) {
        allCoordinates.push(...coords);
      }
    });

    if (allCoordinates.length === 0) {
      // No trail coordinates, center on park
      const parkLoc = park.location;
      if (parkLoc && typeof parkLoc === 'object') {
        googleMapRef.current.setCenter({ lat: parkLoc.lat, lng: parkLoc.lng });
        googleMapRef.current.setZoom(12);
      }
      return;
    }

    const bounds = getBoundsFromCoordinates(allCoordinates);
    if (bounds) {
      const googleBounds = new google.maps.LatLngBounds(
        { lat: bounds.south, lng: bounds.west },
        { lat: bounds.north, lng: bounds.east }
      );
      googleMapRef.current.fitBounds(googleBounds, 50);
    }
  };

  // Toggle map type
  const handleToggleMapType = () => {
    const types: Array<'roadmap' | 'satellite' | 'terrain'> = ['terrain', 'roadmap', 'satellite'];
    const currentIndex = types.indexOf(mapType);
    const nextType = types[(currentIndex + 1) % types.length];
    setMapType(nextType);
  };

  // Open in Google Maps
  const handleOpenInGoogleMaps = () => {
    const loc = park.location;
    if (loc && typeof loc === 'object') {
      window.open(`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`, '_blank');
    }
  };

  if (!hasKey) {
    const center = park.location && typeof park.location === 'object'
      ? { lat: park.location.lat, lng: park.location.lng }
      : { lat: 37.7749, lng: -122.4194 };

    const leafletPolylines = trails
      .map((trail) => {
        const coordinates = extractTrailCoordinates(trail);
        if (!coordinates || !areCoordinatesValid(coordinates)) return null;
        return {
          points: coordinates,
          color: getDifficultyColor(trail.difficulty),
          weight: selectedTrail?.id === trail.id ? 6 : hoveredTrailId === trail.id ? 5 : 3,
          opacity: selectedTrail?.id === trail.id ? 1 : hoveredTrailId === trail.id ? 0.85 : 0.6,
        };
      })
      .filter(Boolean) as Array<{ points: LatLng[]; color: string; weight: number; opacity: number }>;

    const allCoords = leafletPolylines.flatMap((l) => l.points);
    const bounds = allCoords.length ? getBoundsFromCoordinates(allCoords) : null;

    return (
      <div className="relative w-full h-full rounded-xl overflow-hidden">
        <div className="absolute top-4 left-4 right-4 z-30">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">Maps running in fallback mode.</span>{' '}
              Set <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{' '}
              <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">apps/web/.env.local</code> for interactive Google Maps.
            </div>
            <button
              onClick={handleOpenInGoogleMaps}
              className="shrink-0 inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Google Maps
            </button>
          </div>
        </div>

        <LeafletOfflineMap
          center={center}
          zoom={12}
          polylines={leafletPolylines}
          boundingBox={bounds || undefined}
          height="100%"
          interactive={true}
          className="w-full h-full"
        />

        {/* Trail Preview Card - Only show if not hidden by parent */}
        {!hidePreviewCard && showPreview && selectedTrail && (
          <TrailPreviewCard
            trail={selectedTrail}
            hasGeometry={!!extractTrailCoordinates(selectedTrail)}
            onClose={() => {
              setShowPreview(false);
              onTrailDeselect();
            }}
            onViewDetails={() => {
              // TrailDetailPanel is handled by parent
            }}
            onStartHike={() => onStartHike(selectedTrail)}
          />
        )}
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Map Unavailable
          </h3>
          <p className="text-slate-600 mb-4">
            {mapError}
          </p>
          
          {/* Open in Google Maps fallback */}
          <button
            onClick={handleOpenInGoogleMaps}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Google Maps
          </button>
          
          {isDevelopment && (
            <div className="mt-4 bg-white rounded-lg p-4 text-left border border-slate-200">
              <p className="text-sm font-semibold text-slate-700 mb-2">
                To enable maps:
              </p>
              <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                <li>
                  Create <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">apps/web/.env.local</code>
                </li>
                <li>
                  Add: <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key</code>
                </li>
                <li>
                  Restart: <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">npm run dev</code>
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Controls */}
      {mapLoaded && (
        <>
          {/* Top-left: Map type toggle */}
          <div className="absolute top-4 left-4 z-30">
            <button
              onClick={handleToggleMapType}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:bg-slate-50 transition-colors"
              title="Toggle map type"
            >
              <Layers className="w-4 h-4 text-slate-700" />
              <span className="text-sm font-medium text-slate-700 capitalize">
                {mapType}
              </span>
            </button>
          </div>

          {/* Top-right controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
            <button
              onClick={handleLocateMe}
              className="p-3 bg-white rounded-lg shadow-lg hover:bg-slate-50 transition-colors"
              title="Locate me"
            >
              <Navigation className="w-5 h-5 text-slate-700" />
            </button>
            <button
              onClick={handleFitBounds}
              className="p-3 bg-white rounded-lg shadow-lg hover:bg-slate-50 transition-colors"
              title="Fit all trails"
            >
              <Maximize2 className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          {/* Trail count indicator */}
          {trails.length > 0 && (
            <div className="absolute bottom-4 left-4 z-30">
              <div className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow text-sm text-slate-700">
                <span className="font-semibold">{trails.length}</span> trails
                {trails.filter(t => extractTrailCoordinates(t)).length < trails.length && (
                  <span className="text-slate-500 ml-1">
                    ({trails.filter(t => extractTrailCoordinates(t)).length} with route)
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Trail Preview Card - Only show if not hidden by parent */}
      {!hidePreviewCard && showPreview && selectedTrail && (
        <TrailPreviewCard
          trail={selectedTrail}
          hasGeometry={!!extractTrailCoordinates(selectedTrail)}
          onClose={() => {
            setShowPreview(false);
            onTrailDeselect();
          }}
          onViewDetails={() => {
            // TrailDetailPanel is handled by parent
          }}
          onStartHike={() => onStartHike(selectedTrail)}
        />
      )}
    </div>
  );
}

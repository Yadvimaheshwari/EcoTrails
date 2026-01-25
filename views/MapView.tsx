/**
 * Map View
 * Interactive map showing parks and trails
 * Matches mobile app's MapScreen functionality
 */
import React, { useState, useEffect, useRef } from 'react';
import { Park, US_PARKS } from '../data/parks';

// Declare Google Maps types
declare global {
  interface Window {
    google: typeof google;
  initMap: () => void;
  googleMapsLoaded: boolean;
  googleMapsCallback: () => void;
  google?: {
    maps: {
      Map: new (element: HTMLElement, options?: any) => any;
      Marker: new (options?: any) => any;
      MapTypeId: { TERRAIN: string; ROADMAP: string; SATELLITE: string; HYBRID: string };
      SymbolPath: { CIRCLE: any };
      Size: new (width: number, height: number) => any;
    };
  };
}

interface MapViewProps {
  onParkSelect?: (parkId: string) => void;
  onTrailSelect?: (trailId: string) => void;
}

const MapView: React.FC<MapViewProps> = ({ onParkSelect, onTrailSelect }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const markersRef = useRef<any[]>([]);
  const [showParkSheet, setShowParkSheet] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  useEffect(() => {
    // Request user location first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.log('Location permission denied:', err);
        }
      );
    }

    // Load Google Maps script
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'demo') {
      // No API key - use fallback map
      setError('Google Maps API key not configured. Using fallback view.');
      setLoading(false);
      return;
    }

    if (window.google?.maps) {
      // Maps already loaded
      setMapsLoaded(true);
      setTimeout(() => initializeMap(), 100);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        setMapsLoaded(true);
        setTimeout(() => initializeMap(), 100);
      });
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setMapsLoaded(true);
      setTimeout(() => initializeMap(), 100);
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setError('Failed to load Google Maps. Please check your API key.');
      setLoading(false);
    };
    
    document.head.appendChild(script);

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
    };
  }, []);

  // Re-initialize map when user location is available
  useEffect(() => {
    if (mapsLoaded && map && userLocation) {
      map.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      map.setZoom(10);
    }
  }, [userLocation, mapsLoaded, map]);

  const initializeMap = () => {
    if (!mapContainerRef.current || !window.google?.maps) {
      console.error('Map container or Google Maps not available');
      setError('Google Maps not available');
      setLoading(false);
      return;
    }

    try {
      // Default center (US center)
      const defaultCenter = { lat: 39.8283, lng: -98.5795 };
      const center = userLocation || defaultCenter;

      const mapInstance = new window.google.maps.Map(mapContainerRef.current, {
        center,
        zoom: userLocation ? 10 : 5,
        mapTypeId: window.google.maps.MapTypeId.TERRAIN,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });

      setMap(mapInstance);

      // Add park markers
      addParkMarkers(mapInstance);

      // Add user location marker if available
      if (userLocation) {
        new window.google.maps.Marker({
          position: userLocation,
          map: mapInstance,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
          title: 'Your Location',
        });
      }

      setLoading(false);
      setError(null);
    } catch (err: any) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map: ' + (err.message || 'Unknown error'));
      setLoading(false);
    }
  };

  const addParkMarkers = (mapInstance: any) => {
    if (!window.google?.maps) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];

    US_PARKS.forEach((park) => {
      try {
        const marker = new window.google.maps.Marker({
          position: { lat: park.coordinates.lat, lng: park.coordinates.lng },
          map: mapInstance,
          title: park.name,
          icon: {
            url: `data:image/svg+xml;base64,${btoa(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="#2D4739" stroke="white" stroke-width="2"/>
                <text x="16" y="20" font-size="16" text-anchor="middle" fill="white">${park.icon}</text>
              </svg>
            `)}`,
            scaledSize: new window.google.maps.Size(32, 32),
          },
        });

        marker.addListener('click', () => {
          setSelectedPark(park);
          setShowParkSheet(true);
          
          // Center map on park
          mapInstance.setCenter({ lat: park.coordinates.lat, lng: park.coordinates.lng });
          mapInstance.setZoom(10);
        });

        markersRef.current.push(marker);
      } catch (err) {
        console.error(`Error adding marker for ${park.name}:`, err);
      }
    });
  };

  const handleViewPark = () => {
    if (selectedPark && onParkSelect) {
      onParkSelect(selectedPark.id);
      setShowParkSheet(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#F9F9F7] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#2D4739]/20 border-t-[#2D4739] rounded-full animate-spin mx-auto"></div>
          <p className="text-[#8E8B82]">Loading map...</p>
        </div>
      </div>
    );
  }

  // Fallback map view (when Google Maps is not available)
  if (error && !map) {
    return (
      <div className="h-screen bg-[#F9F9F7] relative">
        {/* Fallback: Simple list view of parks */}
        <div className="h-full overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-2xl font-bold text-[#2D4739] mb-6">Parks Map</h2>
            <p className="text-[#8E8B82] mb-6">{error}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {US_PARKS.slice(0, 20).map((park) => (
                <button
                  key={park.id}
                  onClick={() => onParkSelect?.(park.id)}
                  className="bg-white p-4 rounded-xl border border-[#E2E8DE] hover:border-[#2D4739] transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{park.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#2D4739] mb-1">{park.name}</h3>
                      <p className="text-xs text-[#8E8B82]">{park.type} • {park.state}</p>
                      <p className="text-xs text-[#8E8B82] mt-1">
                        {park.coordinates.lat.toFixed(2)}°N, {Math.abs(park.coordinates.lng).toFixed(2)}°W
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 p-4 bg-[#E2E8DE] rounded-xl">
              <p className="text-sm text-[#2D4739] font-semibold mb-2">To enable interactive map:</p>
              <p className="text-xs text-[#8E8B82]">
                Add <code className="bg-white px-2 py-1 rounded">VITE_GOOGLE_MAPS_API_KEY=your_key</code> to your .env file
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen relative bg-[#F9F9F7]">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Park Bottom Sheet */}
      {showParkSheet && selectedPark && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 max-h-[50vh] overflow-y-auto">
          <div className="w-12 h-1 bg-[#E2E8DE] rounded-full mx-auto mb-4" />
          <div className="flex items-start gap-4 mb-4">
            <div className="text-4xl">{selectedPark.icon}</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[#2D4739] mb-1">{selectedPark.name}</h3>
              <p className="text-sm text-[#8E8B82]">{selectedPark.type} • {selectedPark.state}</p>
              {selectedPark.features && selectedPark.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedPark.features.slice(0, 3).map((feature, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 bg-[#E2E8DE] rounded-full text-[#2D4739]">
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleViewPark}
            className="w-full py-3 bg-[#2D4739] text-white rounded-xl font-semibold hover:bg-[#1A2C23] transition-colors"
          >
            View Park
          </button>
          <button
            onClick={() => setShowParkSheet(false)}
            className="w-full mt-2 py-3 border border-[#E2E8DE] text-[#2D4739] rounded-xl font-semibold hover:bg-[#F9F9F7] transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* Location Permission Banner (if denied) */}
      {!userLocation && (
        <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-[#E2E8DE]">
          <p className="text-sm text-[#2D4739] mb-2">
            Enable location to see your position on the map
          </p>
          <button
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    setUserLocation({
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                    });
                    if (map) {
                      map.setCenter({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                      });
                      map.setZoom(10);
                    }
                  },
                  (err) => {
                    alert('Location permission denied. Please enable it in your browser settings.');
                  }
                );
              }
            }}
            className="text-sm text-[#2D4739] font-semibold underline"
          >
            Enable Location
          </button>
        </div>
      )}
    </div>
  );
};

export default MapView;

/**
 * Map View
 * Interactive map showing parks and trails
 * Matches mobile app's MapScreen functionality
 */
import React, { useState, useEffect, useRef } from 'react';
import { Park, US_PARKS } from '../data/parks';

interface MapViewProps {
  onParkSelect?: (parkId: string) => void;
  onTrailSelect?: (trailId: string) => void;
}

const MapView: React.FC<MapViewProps> = ({ onParkSelect, onTrailSelect }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [showParkSheet, setShowParkSheet] = useState(false);

  useEffect(() => {
    // Load Google Maps script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'demo'}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => {
        setError('Failed to load Google Maps. Using fallback view.');
        setLoading(false);
      };
      document.head.appendChild(script);
    } else {
      initializeMap();
    }

    // Request user location
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

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
    };
  }, []);

  const initializeMap = () => {
    if (!mapContainerRef.current) return;

    try {
      // Default center (US center)
      const defaultCenter = { lat: 39.8283, lng: -98.5795 };
      const center = userLocation || defaultCenter;

      const mapInstance = new google.maps.Map(mapContainerRef.current, {
        center,
        zoom: 5,
        mapTypeId: google.maps.MapTypeId.TERRAIN,
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
        new google.maps.Marker({
          position: userLocation,
          map: mapInstance,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
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
    } catch (err: any) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map');
      setLoading(false);
    }
  };

  const addParkMarkers = (mapInstance: google.maps.Map) => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    US_PARKS.forEach((park) => {
      const marker = new google.maps.Marker({
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
          scaledSize: new google.maps.Size(32, 32),
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

  if (error && !map) {
    return (
      <div className="h-screen bg-[#F9F9F7] flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">🗺️</div>
          <h2 className="text-2xl font-bold text-[#2D4739]">Map Unavailable</h2>
          <p className="text-[#8E8B82]">{error}</p>
          <p className="text-sm text-[#8E8B82]">
            To enable the map, add <code className="bg-[#E2E8DE] px-2 py-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to your .env file
          </p>
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

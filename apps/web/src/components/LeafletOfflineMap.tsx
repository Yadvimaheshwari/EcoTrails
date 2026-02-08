'use client';

/**
 * LeafletOfflineMap - Reusable Leaflet map with IndexedDB tile caching
 * Falls back to online OSM tiles when cached tiles are unavailable
 */

import React, { useEffect, useRef, useState } from 'react';
import { offlineMapCache } from '@/lib/offlineMapCache';

interface LeafletOfflineMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  polyline?: Array<{ lat: number; lng: number }>;
  polylines?: Array<{
    points: Array<{ lat: number; lng: number }>;
    color?: string;
    weight?: number;
    opacity?: number;
  }>;
  pois?: Array<{ lat: number; lng: number; name: string; type: string }>;
  boundingBox?: { north: number; south: number; east: number; west: number };
  currentLocation?: { lat: number; lng: number } | null;
  height?: string;
  interactive?: boolean;
  showUserLocation?: boolean;
  className?: string;
}

export function LeafletOfflineMap({
  center,
  zoom = 13,
  polyline,
  polylines,
  pois,
  boundingBox,
  currentLocation,
  height = '400px',
  interactive = true,
  showUserLocation = false,
  className = '',
}: LeafletOfflineMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const hasInitialized = useRef(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || hasInitialized.current) return;
    hasInitialized.current = true;

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;

        // Inject Leaflet CSS if not present
        if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        const mapCenter = center.lat !== 0 ? center : { lat: 40.7128, lng: -74.006 };

        const map = L.map(mapRef.current!, {
          center: [mapCenter.lat, mapCenter.lng],
          zoom,
          zoomControl: interactive,
          dragging: interactive,
          scrollWheelZoom: interactive,
          doubleClickZoom: interactive,
          touchZoom: interactive,
        });

        // Create a custom tile layer that checks IndexedDB first
        const OfflineTileLayer = L.TileLayer.extend({
          createTile: function (coords: any, done: any) {
            const tile = document.createElement('img');
            tile.alt = '';
            tile.setAttribute('role', 'presentation');

            const tileKey = {
              x: coords.x,
              y: coords.y,
              z: coords.z,
              source: 'osm',
            };

            // Try IndexedDB cache first
            offlineMapCache
              .init()
              .then(() => offlineMapCache.getCachedTile(tileKey))
              .then((blob) => {
                if (blob) {
                  // Use cached tile
                  tile.src = URL.createObjectURL(blob);
                  done(null, tile);
                } else {
                  // Fallback to online tile
                  const url = `https://tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;
                  tile.crossOrigin = 'anonymous';
                  tile.src = url;

                  tile.onload = () => done(null, tile);
                  tile.onerror = () => done(new Error('Tile load failed'), tile);
                }
              })
              .catch(() => {
                // Fallback to online tile on any error
                const url = `https://tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;
                tile.crossOrigin = 'anonymous';
                tile.src = url;

                tile.onload = () => done(null, tile);
                tile.onerror = () => done(new Error('Tile load failed'), tile);
              });

            return tile;
          },
        });

        // Add offline-capable tile layer
        (new (OfflineTileLayer as any)('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 18,
        }) as L.TileLayer).addTo(map);

        // Add trail polyline(s)
        const allLatLngs: Array<[number, number]> = [];

        if (polyline && polyline.length > 0) {
          const latlngs = polyline.map((p) => [p.lat, p.lng] as [number, number]);
          allLatLngs.push(...latlngs);
          L.polyline(latlngs, {
            color: '#4F8A6B',
            weight: 4,
            opacity: 0.8,
          }).addTo(map);
        }

        if (polylines && polylines.length > 0) {
          polylines.forEach((line) => {
            if (!line?.points?.length) return;
            const latlngs = line.points.map((p) => [p.lat, p.lng] as [number, number]);
            allLatLngs.push(...latlngs);
            L.polyline(latlngs, {
              color: line.color || '#4F8A6B',
              weight: typeof line.weight === 'number' ? line.weight : 4,
              opacity: typeof line.opacity === 'number' ? line.opacity : 0.8,
            }).addTo(map);
          });
        }

        if (allLatLngs.length > 0) {
          const bounds = L.latLngBounds(allLatLngs);
          map.fitBounds(bounds, { padding: [30, 30] });
        } else if (boundingBox) {
          // Fit to bounding box
          map.fitBounds([
            [boundingBox.south, boundingBox.west],
            [boundingBox.north, boundingBox.east],
          ]);
        }

        // Add POI markers
        if (pois && pois.length > 0) {
          pois.forEach((poi) => {
            const poiIcon = L.divIcon({
              className: 'poi-marker',
              html: `
                <div style="
                  width: 28px;
                  height: 28px;
                  background: #F4A340;
                  border: 2px solid white;
                  border-radius: 50%;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 14px;
                ">${poi.type === 'waypoint' ? '📍' : poi.type === 'landmark' ? '🏛' : '📍'}</div>
              `,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });

            L.marker([poi.lat, poi.lng], { icon: poiIcon })
              .addTo(map)
              .bindPopup(`<b>${poi.name}</b><br/>${poi.type}`);
          });
        }

        mapInstanceRef.current = map;
        setIsMapLoaded(true);
      } catch (err) {
        console.error('[LeafletOfflineMap] Failed to initialize:', err);
        setIsMapLoaded(true);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        hasInitialized.current = false;
      }
    };
  }, []);

  // Update user location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !showUserLocation || !currentLocation) return;

    const updateUserMarker = async () => {
      const L = (await import('leaflet')).default;

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([currentLocation.lat, currentLocation.lng]);
      } else {
        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: `
            <div style="
              width: 18px;
              height: 18px;
              background: #4C7EF3;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>
          `,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        userMarkerRef.current = L.marker([currentLocation.lat, currentLocation.lng], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(mapInstanceRef.current);
      }
    };

    updateUserMarker();
  }, [currentLocation, showUserLocation]);

  return (
    <div className={`relative ${className}`} style={{ minHeight: height }}>
      <div ref={mapRef} className="w-full h-full rounded-2xl" style={{ minHeight: height, zIndex: 1 }} />
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-2xl" style={{ zIndex: 5 }}>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center mb-3 mx-auto animate-pulse">
              <span className="text-2xl">🗺️</span>
            </div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}

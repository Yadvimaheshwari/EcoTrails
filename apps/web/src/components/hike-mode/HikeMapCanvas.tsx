'use client';

/**
 * HikeMapCanvas - Full-screen map for Hike Mode
 * Uses OpenStreetMap tiles for offline capability
 */

import React, { useEffect, useRef, useState } from 'react';
import { DiscoveryNodeWithStatus, DiscoveryCapture, DISCOVERY_CATEGORIES, RARITY_CONFIG } from '@/types/hikeMode';

interface HikeMapCanvasProps {
  trailCenter: { lat: number; lng: number }; // Center on trail, not user
  trailBounds?: { north: number; south: number; east: number; west: number } | null;
  currentLocation: { lat: number; lng: number } | null;
  routePoints: Array<{ lat: number; lng: number; timestamp: number }>;
  trailRoute?: Array<[number, number]>; // Pre-defined trail route [lng, lat] GeoJSON format
  discoveryNodes: DiscoveryNodeWithStatus[];
  captures: DiscoveryCapture[];
  mapLayer: 'topo' | 'satellite' | 'terrain';
  onNodeClick: (node: DiscoveryNodeWithStatus) => void;
  onCenterMe: () => void;
}

export function HikeMapCanvas({
  trailCenter,
  trailBounds = null,
  currentLocation,
  routePoints,
  discoveryNodes,
  captures,
  mapLayer,
  onNodeClick,
  onCenterMe,
}: HikeMapCanvasProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const markersRef = useRef<Map<string, any>>(new Map());
  const routeLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const hasInitialized = useRef(false);

  // Initialize map - center on TRAIL, not user
  useEffect(() => {
    if (!mapRef.current || hasInitialized.current) return;
    hasInitialized.current = true;

    const initMap = async () => {
      try {
        // Dynamic import Leaflet
        const L = (await import('leaflet')).default;
        
        // Import Leaflet CSS via head insertion
        if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // Center on TRAIL location. Parent should only render when coords are valid.
        const center = trailCenter;
        
        const map = L.map(mapRef.current!, {
          center: [center.lat, center.lng],
          zoom: 14,
          zoomControl: false,
        });

        // Add tile layer
        const tileUrls: Record<string, string> = {
          topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          terrain: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', // Fallback to OSM
        };

        L.tileLayer(tileUrls[mapLayer] || tileUrls.topo, {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map);

        // If bounds are available, fit to the trail bounds for the first view
        if (trailBounds && typeof trailBounds.north === 'number') {
          try {
            map.fitBounds(
              [
                [trailBounds.south, trailBounds.west],
                [trailBounds.north, trailBounds.east],
              ],
              { padding: [30, 30] }
            );
          } catch (e) {
            // If bounds are malformed, just keep centered
          }
        }

        // Add trail marker at center
        const trailIcon = L.divIcon({
          className: 'trail-center-marker',
          html: `
            <div style="
              width: 32px;
              height: 32px;
              background: #4F8A6B;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
            ">🥾</div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        
        L.marker([center.lat, center.lng], { icon: trailIcon }).addTo(map);

        setMapInstance(map);
        setIsMapLoaded(true);

      } catch (err) {
        console.error('[HikeMapCanvas] Failed to initialize map:', err);
        setIsMapLoaded(true); // Still show UI even if map fails
      }
    };

    initMap();

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [trailCenter, trailBounds]);

  // Update tile layer when mapLayer changes
  useEffect(() => {
    if (!mapInstance) return;

    const tileUrls: Record<string, string> = {
      topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      terrain: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    };

    // Remove existing tile layers and add new one
    mapInstance.eachLayer((layer: any) => {
      if (layer._url) {
        mapInstance.removeLayer(layer);
      }
    });

    const L = require('leaflet');
    L.tileLayer(tileUrls[mapLayer] || tileUrls.topo, {
      maxZoom: 18,
    }).addTo(mapInstance);

  }, [mapLayer, mapInstance]);

  // Update user location marker - DON'T auto-center
  useEffect(() => {
    if (!mapInstance || !currentLocation) return;

    const L = require('leaflet');

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([currentLocation.lat, currentLocation.lng]);
    } else {
      // Create custom user marker
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: #4C7EF3;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      userMarkerRef.current = L.marker([currentLocation.lat, currentLocation.lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(mapInstance);
    }
    
    // DON'T auto-center - let user control the map
    // User can click "center on me" button if needed

  }, [currentLocation, mapInstance]);

  // Update route polyline
  useEffect(() => {
    if (!mapInstance || routePoints.length < 2) return;

    const L = require('leaflet');

    if (routeLayerRef.current) {
      mapInstance.removeLayer(routeLayerRef.current);
    }

    const latlngs = routePoints.map(p => [p.lat, p.lng]);
    routeLayerRef.current = L.polyline(latlngs, {
      color: '#4F8A6B',
      weight: 4,
      opacity: 0.8,
    }).addTo(mapInstance);

  }, [routePoints, mapInstance]);

  // Update discovery markers
  useEffect(() => {
    if (!mapInstance) return;

    const L = require('leaflet');

    // Remove old markers that are no longer in the list
    markersRef.current.forEach((marker, id) => {
      if (!discoveryNodes.find(n => n.id === id)) {
        mapInstance.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    discoveryNodes.forEach(node => {
      const isCaptured = captures.some(c => c.nodeId === node.id);
      const categoryInfo = DISCOVERY_CATEGORIES[node.category];

      const markerHtml = `
        <div style="
          width: 36px;
          height: 36px;
          background: ${isCaptured ? '#9CA3AF' : categoryInfo.color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 3px solid white;
          ${node.status === 'nearby' && !isCaptured ? 'animation: pulse-discovery 2s ease-in-out infinite;' : ''}
          ${isCaptured ? 'opacity: 0.6;' : ''}
          cursor: pointer;
        ">
          ${categoryInfo.icon}
        </div>
      `;

      const icon = L.divIcon({
        className: 'discovery-marker',
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (markersRef.current.has(node.id)) {
        const marker = markersRef.current.get(node.id);
        marker.setIcon(icon);
      } else {
        const marker = L.marker([node.lat, node.lng], { icon })
          .addTo(mapInstance)
          .on('click', () => onNodeClick(node));
        markersRef.current.set(node.id, marker);
      }
    });

  }, [discoveryNodes, captures, mapInstance, onNodeClick]);

  // Handle center on me
  const handleCenterOnMe = () => {
    if (mapInstance && currentLocation) {
      mapInstance.setView([currentLocation.lat, currentLocation.lng], 16, { animate: true });
    }
  };

  // Handle center on trail
  const handleCenterOnTrail = () => {
    if (mapInstance && trailCenter.lat !== 0) {
      mapInstance.setView([trailCenter.lat, trailCenter.lng], 14, { animate: true });
    }
  };

  return (
    <div className="absolute inset-0">
      <div ref={mapRef} className="w-full h-full" style={{ zIndex: 1 }} />
      
      {/* Loading overlay */}
      {!isMapLoaded && (
        <div className="absolute inset-0 bg-gradient-to-b from-mossGreen/10 to-pineGreen/20 flex items-center justify-center" style={{ zIndex: 5 }}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center mb-4 mx-auto animate-pulse">
              <span className="text-3xl">🗺️</span>
            </div>
            <p className="text-pineGreen font-medium">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Controls - Right side */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
        {/* Center on Trail */}
        <button
          onClick={handleCenterOnTrail}
          className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
          title="Center on trail"
        >
          <span className="text-lg">🥾</span>
        </button>
        
        {/* Center on Me */}
        <button
          onClick={handleCenterOnMe}
          className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
          title="Center on my location"
        >
          <span className="text-lg">📍</span>
        </button>
        
        {/* Zoom In */}
        <button
          onClick={() => mapInstance?.zoomIn()}
          className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200 text-xl font-bold text-gray-600"
          title="Zoom in"
        >
          +
        </button>
        
        {/* Zoom Out */}
        <button
          onClick={() => mapInstance?.zoomOut()}
          className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200 text-xl font-bold text-gray-600"
          title="Zoom out"
        >
          −
        </button>
      </div>
    </div>
  );
}

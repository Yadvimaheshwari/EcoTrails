'use client';

import { useState, useEffect, useRef } from 'react';
import { offlineMapCache } from '@/lib/offlineMapCache';
import { MarauderMapRenderer } from '@/lib/marauderMapRenderer';

interface MarauderMapViewerProps {
  trailId: string;
  trailName: string;
  polyline?: Array<{ lat: number; lng: number; elevation?: number }>;
  pois?: Array<{ lat: number; lng: number; name: string; type: string }>;
  boundingBox?: { north: number; south: number; east: number; west: number };
  metadata?: {
    difficulty?: string;
    regulations?: string[];
    seasonal_notes?: string[];
    region?: string;
    elevation_range?: { min: number; max: number };
  };
}

export function MarauderMapViewer({
  trailId,
  trailName,
  polyline,
  pois,
  boundingBox,
  metadata,
}: MarauderMapViewerProps) {
  const [mapSvg, setMapSvg] = useState<string>('');
  const [legend, setLegend] = useState<Array<{ icon: string; label: string; description: string }>>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    renderMap();
  }, [trailId, polyline, pois, boundingBox, metadata]);

  const renderMap = async () => {
    if (!boundingBox || !polyline || polyline.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const startTime = performance.now();

      // Try to get cached trail data for elevation
      await offlineMapCache.init();
      const trailData = await offlineMapCache.getCachedTrailData(trailId);
      const cachedPOIs = await offlineMapCache.getCachedPOIs(trailId);

      // Enhance polyline with elevation if available
      let enhancedPolyline = polyline;
      if (trailData?.polyline && Array.isArray(trailData.polyline)) {
        // Merge elevation data if available
        enhancedPolyline = polyline.map((point, idx) => {
          const cachedPoint = trailData.polyline[idx];
          return {
            ...point,
            elevation: cachedPoint?.elevation || point.elevation,
          };
        });
      }

      const displayPOIs = cachedPOIs?.pois || pois || [];
      const displayBounds = trailData?.boundingBox || boundingBox;

      // Create renderer
      const renderer = new MarauderMapRenderer({
        polyline: enhancedPolyline,
        pois: displayPOIs,
        boundingBox: displayBounds,
        metadata: metadata || {},
      });

      // Get container dimensions
      const width = containerRef.current?.clientWidth || 800;
      const height = 600;

      // Render map
      const svg = renderer.render(width, height);
      setMapSvg(svg);
      setLegend(renderer.getLegend());

      const renderTime = performance.now() - startTime;
      console.log(`Marauder map rendered in ${renderTime.toFixed(2)}ms`);

      if (renderTime > 2000) {
        console.warn('Marauder map render time exceeded 2 seconds');
      }
    } catch (error) {
      console.error('Failed to render marauder map:', error);
      setMapSvg('');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center" style={{ backgroundColor: '#F4E4BC' }}>
        <div className="text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <div className="text-textSecondary">Rendering illustrated map...</div>
        </div>
      </div>
    );
  }

  if (!mapSvg) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center rounded-2xl" style={{ backgroundColor: '#F4E4BC', border: '1px solid #8B6F47' }}>
        <div className="text-center text-textSecondary">
          <div className="text-4xl mb-4">🗺️</div>
          <div>No map data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden shadow-lg"
        style={{ 
          backgroundColor: '#F4E4BC', 
          border: '2px solid #8B6F47',
          minHeight: '400px',
          maxHeight: '600px'
        }}
        dangerouslySetInnerHTML={{ __html: mapSvg }}
      />

      {/* Legend */}
      <div className="p-4 rounded-2xl" style={{ backgroundColor: '#F4E4BC', border: '1px solid #8B6F47' }}>
        <h3 className="text-lg font-semibold mb-3 text-text" style={{ fontFamily: 'serif' }}>Map Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {legend.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-lg">{item.icon}</span>
              <div>
                <div className="text-sm font-medium text-text">{item.label}</div>
                <div className="text-xs text-textSecondary">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclosure */}
      <div className="p-4 rounded-2xl text-xs text-textSecondary" style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3' }}>
        <div className="font-medium mb-2 text-text">What this map is based on:</div>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Trail route from GPS track data</li>
          {polyline && polyline.length > 0 && (
            <li>{polyline.length} GPS waypoints</li>
          )}
          {metadata?.elevation_range && (
            <li>Elevation range: {metadata.elevation_range.min} - {metadata.elevation_range.max} ft</li>
          )}
          {pois && pois.length > 0 && (
            <li>{pois.length} points of interest</li>
          )}
          {metadata?.region && (
            <li>Region: {metadata.region}</li>
          )}
          <li>Wildlife and vegetation zones are based on elevation bands and regional data - not specific sightings</li>
          <li>Callouts generated from trail metadata and elevation profile analysis</li>
        </ul>
      </div>
    </div>
  );
}

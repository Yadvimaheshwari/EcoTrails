'use client';

import { useState, useEffect } from 'react';
import { getTrailMap } from '@/lib/api';
import { LoadingState } from './ui/LoadingState';
import { EmptyState } from './ui/EmptyState';
import { LeafletOfflineMap } from '@/components/LeafletOfflineMap';

interface TrailMapViewerProps {
  trailId: string;
  trailName: string;
  // Optional trail data for fallback interactive map
  trailCoordinates?: Array<{ lat: number; lng: number }>;
  trailCenter?: { lat: number; lng: number };
  trailBoundingBox?: { north: number; south: number; east: number; west: number };
  pois?: Array<{ lat: number; lng: number; name: string; type: string }>;
}

export function TrailMapViewer({ 
  trailId, 
  trailName,
  trailCoordinates,
  trailCenter,
  trailBoundingBox,
  pois,
}: TrailMapViewerProps) {
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWaypoint, setSelectedWaypoint] = useState<any>(null);
  const [showLeafletFallback, setShowLeafletFallback] = useState(false);

  useEffect(() => {
    loadMap();
  }, [trailId]);

  const loadMap = async () => {
    try {
      setLoading(true);
      setError(null);
      setShowLeafletFallback(false);
      const response = await getTrailMap(trailId);
      if (response.data && response.data.success) {
        setMapData(response.data.map_data);
      } else {
        const errorMsg = response.data?.error || response.data?.detail || 'Failed to generate map';
        setError(errorMsg);
        setShowLeafletFallback(true);
        console.error('Map generation failed:', response.data);
      }
    } catch (err: any) {
      console.error('Failed to load trail map:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to load map.';
      setError(errorMsg);
      setShowLeafletFallback(true);
    } finally {
      setLoading(false);
    }
  };

  // Compute a center from coordinates or bounding box
  const fallbackCenter = trailCenter 
    || (trailCoordinates && trailCoordinates.length > 0 
        ? { 
            lat: trailCoordinates.reduce((s, p) => s + p.lat, 0) / trailCoordinates.length, 
            lng: trailCoordinates.reduce((s, p) => s + p.lng, 0) / trailCoordinates.length 
          }
        : trailBoundingBox 
          ? { 
              lat: (trailBoundingBox.north + trailBoundingBox.south) / 2, 
              lng: (trailBoundingBox.east + trailBoundingBox.west) / 2 
            }
          : null);

  const hasFallbackMapData = !!(trailCoordinates?.length || trailBoundingBox || fallbackCenter);

  if (loading) {
    return (
      <div className="card p-8">
        <LoadingState message="Generating detailed trail map..." />
      </div>
    );
  }

  // Show interactive Leaflet fallback when AI map fails
  if ((error || showLeafletFallback) && hasFallbackMapData) {
    return (
      <div className="space-y-6">
        {/* Interactive Leaflet Map */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">🗺️ Interactive Trail Map</h3>
            <button
              onClick={loadMap}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
              style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3', color: '#5F6F6A' }}
            >
              🔄 Try AI Map
            </button>
          </div>
          <LeafletOfflineMap
            center={fallbackCenter!}
            zoom={13}
            polyline={trailCoordinates}
            pois={pois}
            boundingBox={trailBoundingBox}
            height="500px"
            interactive={true}
            className="rounded-2xl overflow-hidden"
          />
          <p className="text-sm text-textSecondary mt-4">
            Interactive map with trail route and points of interest. Zoom and pan to explore. 
            AI-generated detailed map is being retried in the background.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8">
        <EmptyState
          icon="🗺️"
          title="Map unavailable"
          message={error}
        />
        <div className="mt-4 text-center">
          <button
            onClick={loadMap}
            className="px-4 py-2 bg-pineGreen text-fogWhite rounded-lg hover:bg-pineGreen/90 transition-colors"
          >
            Try Again
          </button>
        </div>
        <div className="mt-4 p-3 bg-stoneGray/20 rounded-lg text-sm text-textSecondary">
          <strong>Note:</strong> Trail maps are generated using AI. If this error persists, it may be due to AI service configuration. The map includes waypoints, terrain features, landmarks, and safety information for offline navigation.
        </div>
      </div>
    );
  }

  if (!mapData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Visual SVG Map - Show first if available */}
      {mapData.svg_code && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">🗺️ Trail Map</h3>
            <div className="flex gap-2">
              {hasFallbackMapData && (
                <button
                  onClick={() => setShowLeafletFallback(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3', color: '#5F6F6A' }}
                >
                  🌐 Interactive Map
                </button>
              )}
              <button
                onClick={() => {
                  const svgBlob = new Blob([mapData.svg_code], { type: 'image/svg+xml' });
                  const url = URL.createObjectURL(svgBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${trailName.replace(/\s+/g, '_')}_trail_map.svg`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{ backgroundColor: '#4F8A6B', color: 'white', border: 'none' }}
              >
                📥 Download Map
              </button>
            </div>
          </div>

          {/* Show Leaflet interactive map if user toggled it */}
          {showLeafletFallback && hasFallbackMapData ? (
            <div className="mb-4">
              <LeafletOfflineMap
                center={fallbackCenter!}
                zoom={13}
                polyline={trailCoordinates}
                pois={pois}
                boundingBox={trailBoundingBox}
                height="500px"
                interactive={true}
                className="rounded-2xl overflow-hidden"
              />
              <button
                onClick={() => setShowLeafletFallback(false)}
                className="mt-2 text-sm text-textSecondary hover:text-text transition-colors"
              >
                ← Back to AI Map
              </button>
            </div>
          ) : (
            <div className="bg-stoneGray/20 rounded-lg p-4 overflow-auto border border-stoneGray">
              <div 
                className="w-full flex items-center justify-center min-h-[400px]"
                dangerouslySetInnerHTML={{ __html: mapData.svg_code }}
              />
            </div>
          )}
          <p className="text-sm text-textSecondary mt-4">
            This professional topographic map is designed for offline navigation. Download it before your hike for offline use!
          </p>
        </div>
      )}

      {/* If no SVG but has fallback coordinates, show Leaflet map */}
      {!mapData.svg_code && hasFallbackMapData && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-4">🗺️ Interactive Trail Map</h3>
          <LeafletOfflineMap
            center={fallbackCenter!}
            zoom={13}
            polyline={trailCoordinates}
            pois={pois}
            boundingBox={trailBoundingBox}
            height="500px"
            interactive={true}
            className="rounded-2xl overflow-hidden"
          />
        </div>
      )}
      
      {/* Map Description */}
      {mapData.map_description && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-3">Map Overview</h3>
          <p className="text-textSecondary">{mapData.map_description}</p>
        </div>
      )}

      {/* Waypoints */}
      {mapData.waypoints && mapData.waypoints.length > 0 && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-4">Key Waypoints</h3>
          <div className="space-y-3">
            {mapData.waypoints.map((waypoint: any, idx: number) => (
              <div
                key={idx}
                className="border border-stoneGray rounded-lg p-4 hover:bg-stoneGray/20 transition-colors cursor-pointer"
                onClick={() => setSelectedWaypoint(waypoint)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold mb-1">{waypoint.name}</div>
                    <div className="text-sm text-textSecondary">
                      {waypoint.distance_from_start} mi from start
                      {waypoint.elevation && ` • ${waypoint.elevation} ft elevation`}
                    </div>
                    {waypoint.description && (
                      <p className="text-sm text-textSecondary mt-2">{waypoint.description}</p>
                    )}
                  </div>
                  <span className="text-2xl">📍</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Terrain Features */}
      {mapData.terrain_features && mapData.terrain_features.length > 0 && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-4">Terrain Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mapData.terrain_features.map((feature: any, idx: number) => (
              <div key={idx} className="border border-stoneGray rounded-lg p-4">
                <div className="font-semibold mb-1">{feature.name || feature.type}</div>
                <div className="text-sm text-textSecondary">
                  {feature.location && <div>📍 {feature.location}</div>}
                  {feature.elevation && <div>⛰️ {feature.elevation} ft</div>}
                </div>
                {feature.description && (
                  <p className="text-sm text-textSecondary mt-2">{feature.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Landmarks */}
      {mapData.landmarks && mapData.landmarks.length > 0 && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-4">Points of Interest</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mapData.landmarks.map((landmark: any, idx: number) => (
              <div key={idx} className="border border-stoneGray rounded-lg p-4">
                <div className="font-semibold mb-1">{landmark.name}</div>
                <div className="text-sm text-textSecondary">
                  {landmark.distance_from_start} mi from start
                </div>
                {landmark.description && (
                  <p className="text-sm text-textSecondary mt-2">{landmark.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Notes */}
      {mapData.safety_notes && mapData.safety_notes.length > 0 && (
        <div className="card p-6 border-l-4 border-yellow-500">
          <h3 className="text-xl font-semibold mb-4">⚠️ Safety Information</h3>
          <div className="space-y-3">
            {mapData.safety_notes.map((note: any, idx: number) => (
              <div key={idx} className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <div className="font-semibold mb-1">{note.location}</div>
                <div className="text-sm text-textSecondary">{note.warning}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vegetation Zones */}
      {mapData.vegetation_zones && mapData.vegetation_zones.length > 0 && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-4">🌲 Vegetation Zones</h3>
          <div className="space-y-4">
            {mapData.vegetation_zones.map((zone: any, idx: number) => (
              <div key={idx} className="border border-stoneGray rounded-lg p-4">
                <div className="font-semibold mb-2">{zone.name}</div>
                <div className="text-sm text-textSecondary mb-2">
                  Miles {zone.start_mile} - {zone.end_mile}
                </div>
                {zone.vegetation && zone.vegetation.length > 0 && (
                  <div className="mb-2">
                    <div className="text-sm font-medium mb-1">Vegetation:</div>
                    <div className="flex flex-wrap gap-2">
                      {zone.vegetation.map((veg: string, vIdx: number) => (
                        <span key={vIdx} className="text-xs bg-pineGreen/20 text-pineGreen px-2 py-1 rounded">
                          {veg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {zone.wildlife && zone.wildlife.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-1">Wildlife:</div>
                    <div className="flex flex-wrap gap-2">
                      {zone.wildlife.map((animal: string, aIdx: number) => (
                        <span key={aIdx} className="text-xs bg-skyAccent/20 text-skyAccent px-2 py-1 rounded">
                          {animal}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Info */}
      {mapData.navigation && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-4">🧭 Navigation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mapData.navigation.compass_directions && (
              <div>
                <div className="font-medium mb-2">Directions:</div>
                <div className="text-sm text-textSecondary space-y-1">
                  {Object.entries(mapData.navigation.compass_directions).map(([dir, desc]: [string, any]) => (
                    <div key={dir}>
                      <span className="font-medium">{dir.toUpperCase()}:</span> {desc}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              {mapData.navigation.scale && (
                <div className="mb-2">
                  <div className="font-medium">Scale:</div>
                  <div className="text-sm text-textSecondary">{mapData.navigation.scale}</div>
                </div>
              )}
              {mapData.navigation.estimated_time && (
                <div>
                  <div className="font-medium">Estimated Time:</div>
                  <div className="text-sm text-textSecondary">{mapData.navigation.estimated_time}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waypoint Detail Modal */}
      {selectedWaypoint && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedWaypoint(null)}
        >
          <div
            className="bg-background rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-4">{selectedWaypoint.name}</h3>
            <div className="space-y-2 text-textSecondary mb-4">
              <div>📍 {selectedWaypoint.distance_from_start} mi from start</div>
              {selectedWaypoint.elevation && <div>⛰️ {selectedWaypoint.elevation} ft elevation</div>}
              {selectedWaypoint.type && <div>Type: {selectedWaypoint.type}</div>}
            </div>
            {selectedWaypoint.description && (
              <p className="text-textSecondary mb-4">{selectedWaypoint.description}</p>
            )}
            <button
              onClick={() => setSelectedWaypoint(null)}
              className="w-full px-4 py-2 bg-pineGreen text-fogWhite rounded-lg hover:bg-pineGreen/90"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

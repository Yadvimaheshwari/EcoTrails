'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getTrail, getPlace, createHike, getTrailVegetation, getPlaceWeather, getTrailRoute } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { setAuthToken } from '@/lib/api';
import { TrailMapViewer } from '@/components/TrailMapViewer';
import { HikeStartSheet } from '@/components/HikeStartSheet';
import Link from 'next/link';

export default function NewHikePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, token } = useAuth();
  const [trailId, setTrailId] = useState<string | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [trail, setTrail] = useState<any>(null);
  const [place, setPlace] = useState<any>(null);
  const [vegetationInfo, setVegetationInfo] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [expandedConditions, setExpandedConditions] = useState(false);
  const [expandedVegetation, setExpandedVegetation] = useState(false);
  const [expandedWildlife, setExpandedWildlife] = useState(false);
  const [showStartSheet, setShowStartSheet] = useState(false);
  const [trailRoute, setTrailRoute] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && token) {
      setAuthToken(token);
    }

    const trailParam = searchParams.get('trailId');
    const placeParam = searchParams.get('placeId');
    
    if (trailParam) {
      setTrailId(trailParam);
      loadTrail(trailParam);
    }
    if (placeParam) {
      setPlaceId(placeParam);
      loadPlace(placeParam);
    }

    if (!trailParam && !placeParam) {
      setLoading(false);
    }
  }, [user, isLoading, searchParams, router, token]);

  const loadTrail = async (id: string) => {
    try {
      const response = await getTrail(id);
      setTrail(response.data);
      
      // Load vegetation info
      try {
        const vegResponse = await getTrailVegetation(id);
        if (vegResponse.data.success) {
          setVegetationInfo(vegResponse.data.vegetation_info);
        }
      } catch (error) {
        console.error('Failed to load vegetation info:', error);
      }
      
      // Load trail route for fallback map
      try {
        const routeResponse = await getTrailRoute(id);
        if (routeResponse.data?.geojson?.coordinates) {
          setTrailRoute(routeResponse.data);
        }
      } catch (error) {
        console.error('Failed to load trail route:', error);
      }

      // Load weather if we have place
      if (response.data.place_id) {
        try {
          const weatherRes = await getPlaceWeather(response.data.place_id);
          setWeather(weatherRes.data);
        } catch (error) {
          console.error('Failed to load weather:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlace = async (id: string) => {
    try {
      const response = await getPlace(id);
      setPlace(response.data);
    } catch (error) {
      console.error('Failed to load place:', error);
    }
  };

  const handleStartClick = () => {
    setShowStartSheet(true);
  };

  const handleCreateHike = async () => {
    if (!trailId && !placeId) {
      alert('Please select a trail or place');
      return;
    }

    setCreating(true);
    try {
      const response = await createHike(trailId || undefined, placeId || undefined);
      
      const hikeId = response.data.hike?.id || response.data.id || response.data.hike_id;
      if (hikeId) {
        router.push(`/hikes/${hikeId}`);
      } else {
        router.push('/hikes');
      }
    } catch (error: any) {
      console.error('Failed to create hike:', error);
      alert(error.response?.data?.detail || error.response?.data?.message || 'Failed to create hike');
      setCreating(false);
    }
  };

  if (isLoading || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F6F8F7' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#0F3D2E' }}></div>
          <p className="text-textSecondary">Loading trail details...</p>
        </div>
      </div>
    );
  }

  if (!trail && !place) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12" style={{ backgroundColor: '#F6F8F7' }}>
        <p className="text-textSecondary">Select a trail or place to start your hike</p>
      </div>
    );
  }

  // Generate readiness summary
  const getReadinessSummary = () => {
    if (!trail || !weather) return null;
    
    const isCold = weather.temperature < 32;
    const isSnowing = weather.description?.toLowerCase().includes('snow');
    const difficulty = trail.difficulty?.toLowerCase() || 'easy';
    
    let summary = `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ${trail.distance_miles ? `${trail.distance_miles} mi` : ''} trail.`;
    
    if (isSnowing) {
      summary += ' Snow possible near shaded areas.';
    }
    if (isCold) {
      summary += ' Traction recommended.';
    }
    
    return summary;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F6F8F7' }}>
      {/* Sticky Trail Header */}
      <div 
        className="sticky top-0 z-50 p-4 shadow-sm"
        style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E8E8E3' }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-medium text-text mb-1">
                {trail?.name || place?.name || 'New Hike'}
              </h1>
              <div className="flex items-center gap-3 text-sm text-textSecondary">
                {trail?.distance_miles && <span>{trail.distance_miles} mi</span>}
                {trail?.difficulty && <span>· {trail.difficulty}</span>}
                {trail?.elevation_gain_feet && <span>· +{Math.round(trail.elevation_gain_feet)} ft</span>}
                {trail?.estimated_duration_minutes && (
                  <span>· ⏱ ~{Math.round(trail.estimated_duration_minutes / 60)} hr</span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              {trail?.place?.location && (() => {
                const location = trail.place.location;
                const lat = typeof location === 'object' ? location.lat || location.latitude : null;
                const lng = typeof location === 'object' ? location.lng || location.longitude : null;
                return lat && lng ? (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all inline-block text-center"
                    style={{
                      backgroundColor: '#FAFAF8',
                      color: '#5F6F6A',
                      border: '1px solid #E8E8E3',
                    }}
                  >
                    Directions
                  </a>
                ) : (
                  <button
                    onClick={() => setShowMap(!showMap)}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: showMap ? '#4C7EF3' : '#FAFAF8',
                      color: showMap ? 'white' : '#5F6F6A',
                      border: '1px solid #E8E8E3',
                    }}
                  >
                    View Map
                  </button>
                );
              })()}
              <button
                onClick={handleStartClick}
                disabled={creating || (!trailId && !placeId)}
                className="px-6 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                style={{
                  backgroundColor: '#4C7EF3',
                  backgroundImage: 'linear-gradient(to bottom, #4C7EF3, #3B6ED8)',
                }}
              >
                {creating ? 'Starting...' : 'Start hike'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Readiness Summary */}
        {getReadinessSummary() && (
          <div className="mb-6 p-4 rounded-2xl" style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3' }}>
            <p className="text-sm text-text">{getReadinessSummary()}</p>
          </div>
        )}

        {/* SECTION 1: Trail Essentials (Scan Blocks) */}
        {trail && (
          <div className="mb-8">
            <h2 className="text-2xl font-light mb-4 text-text">Trail essentials</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {trail.distance_miles && (
                <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}>
                  <div className="text-xs text-textSecondary mb-1">Distance</div>
                  <div className="text-lg font-medium text-text">{trail.distance_miles} mi</div>
                </div>
              )}
              {trail.elevation_gain_feet && (
                <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}>
                  <div className="text-xs text-textSecondary mb-1">Elevation gain</div>
                  <div className="text-lg font-medium text-text">{Math.round(trail.elevation_gain_feet)} ft</div>
                </div>
              )}
              {trail.estimated_duration_minutes && (
                <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}>
                  <div className="text-xs text-textSecondary mb-1">Est time</div>
                  <div className="text-lg font-medium text-text">
                    {Math.round(trail.estimated_duration_minutes / 60)}h {trail.estimated_duration_minutes % 60}m
                  </div>
                </div>
              )}
              <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}>
                <div className="text-xs text-textSecondary mb-1">Loop type</div>
                <div className="text-lg font-medium text-text">
                  {trail.description?.toLowerCase().includes('loop') ? 'Loop' : 'Out & back'}
                </div>
              </div>
              <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}>
                <div className="text-xs text-textSecondary mb-1">Surface</div>
                <div className="text-lg font-medium text-text">
                  {trail.description?.toLowerCase().includes('paved') ? 'Paved' : 'Packed dirt'}
                </div>
              </div>
              <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}>
                <div className="text-xs text-textSecondary mb-1">Shade</div>
                <div className="text-lg font-medium text-text">
                  {trail.description?.toLowerCase().includes('shade') ? 'Moderate' : 'Limited'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Conditions (Compressed) */}
        {weather && weather.success && (
          <div className="mb-8">
            <h2 className="text-2xl font-light mb-4 text-text">Conditions</h2>
            <button
              onClick={() => setExpandedConditions(!expandedConditions)}
              className="w-full p-4 rounded-2xl text-left transition-all"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-medium text-text">
                    {Math.round(weather.temperature)}°F · {weather.description}
                  </div>
                  <div className="text-sm text-textSecondary mt-1">
                    Wind {Math.round(weather.wind_speed)} mph
                    {weather.temperature < 32 && (
                      <span className="ml-2">⚠ Cold exposure risk</span>
                    )}
                  </div>
                </div>
                <span className="text-textSecondary">{expandedConditions ? '−' : '+'}</span>
              </div>
              {expandedConditions && (
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-textSecondary">Feels like</div>
                    <div className="font-medium text-text">{Math.round(weather.feels_like)}°F</div>
                  </div>
                  <div>
                    <div className="text-textSecondary">Humidity</div>
                    <div className="font-medium text-text">{weather.humidity}%</div>
                  </div>
                  <div>
                    <div className="text-textSecondary">Visibility</div>
                    <div className="font-medium text-text">
                      {weather.visibility ? (weather.visibility / 1609.34).toFixed(1) : 'N/A'} mi
                    </div>
                  </div>
                  <div>
                    <div className="text-textSecondary">Pressure</div>
                    <div className="font-medium text-text">{weather.pressure} hPa</div>
                  </div>
                </div>
              )}
            </button>
          </div>
        )}

        {/* SECTION 3: What You'll See (Chips Only) */}
        {vegetationInfo && (
          <div className="mb-8">
            <h2 className="text-2xl font-light mb-4 text-text">What you'll see</h2>
            
            {vegetationInfo.vegetation_zones && vegetationInfo.vegetation_zones.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setExpandedVegetation(!expandedVegetation)}
                  className="w-full p-4 rounded-2xl text-left transition-all mb-2"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text">Vegetation</span>
                    <span className="text-textSecondary">{expandedVegetation ? '−' : '+'}</span>
                  </div>
                </button>
                {expandedVegetation && (
                  <div className="p-4 rounded-2xl mb-2" style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3' }}>
                    <div className="flex flex-wrap gap-2">
                      {vegetationInfo.vegetation_zones.slice(0, 5).map((zone: any, idx: number) => (
                        <span key={idx} className="px-3 py-1 rounded-lg text-sm" style={{ backgroundColor: '#4F8A6B20', color: '#4F8A6B' }}>
                          • {zone.zone_name || zone.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {vegetationInfo.wildlife && (
              <div>
                <button
                  onClick={() => setExpandedWildlife(!expandedWildlife)}
                  className="w-full p-4 rounded-2xl text-left transition-all"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text">Wildlife</span>
                    <span className="text-textSecondary">{expandedWildlife ? '−' : '+'}</span>
                  </div>
                </button>
                {expandedWildlife && (
                  <div className="p-4 rounded-2xl mt-2" style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3' }}>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ...(vegetationInfo.wildlife.birds || []).slice(0, 5),
                        ...(vegetationInfo.wildlife.mammals || []).slice(0, 5)
                      ].map((animal: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 rounded-lg text-sm" style={{ backgroundColor: '#4C7EF320', color: '#4C7EF3' }}>
                          • {animal}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: Discovery Mode Teaser */}
        <div className="mb-8">
          <h2 className="text-2xl font-light mb-4 text-text">Possible discoveries on this trail</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🦌', label: 'Wildlife', type: 'wildlife' },
              { icon: '🌿', label: 'Vegetation', type: 'plant' },
              { icon: '🪨', label: 'Geology', type: 'geology' },
              { icon: '🏛', label: 'History', type: 'cultural' },
            ].map((discovery, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl text-center cursor-pointer hover:shadow-sm transition-all"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}
                onClick={() => {
                  // Open AI camera when hike starts
                  alert('Discovery mode will be available during your hike');
                }}
              >
                <div className="text-3xl mb-2">{discovery.icon}</div>
                <div className="text-sm text-text">{discovery.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: Safety & Alerts */}
        <div className="mb-8">
          <h2 className="text-2xl font-light mb-4 text-text">Safety notes</h2>
          <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FFF8F0', border: '1px solid #F4A34040' }}>
            <ul className="space-y-2 text-sm text-text">
              {trail?.description?.toLowerCase().includes('rock') && (
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Slippery rock sections</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Limited cell service</span>
              </li>
              {trail?.description?.toLowerCase().includes('poison') && (
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Poison ivy present</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Trail Map */}
        {showMap && trail?.id && (
          <div className="mb-8">
            <TrailMapViewer 
              trailId={trail.id} 
              trailName={trail.name}
              trailCoordinates={
                trailRoute?.geojson?.coordinates
                  ? trailRoute.geojson.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
                  : undefined
              }
              trailCenter={
                trail.place?.location
                  ? { lat: trail.place.location.lat || trail.place.location.latitude, lng: trail.place.location.lng || trail.place.location.longitude }
                  : undefined
              }
              trailBoundingBox={trailRoute?.bounds}
            />
          </div>
        )}

        {/* Final CTA - Sticky Bottom Button */}
        <div className="sticky bottom-0 left-0 right-0 p-4 -mx-6 -mb-8" style={{ backgroundColor: '#F6F8F7' }}>
          <button
            onClick={handleStartClick}
            disabled={creating || (!trailId && !placeId)}
            className="w-full px-8 py-4 rounded-xl font-medium text-white transition-all disabled:opacity-50"
            style={{
              backgroundColor: '#4F8A6B',
              backgroundImage: 'linear-gradient(to bottom, #4F8A6B, #0F3D2E)',
            }}
          >
            {creating ? 'Starting hike...' : '🟢 Start hike'}
          </button>
        </div>
      </div>

      {/* Hike Start Confirmation Sheet */}
      <HikeStartSheet
        isOpen={showStartSheet}
        onClose={() => setShowStartSheet(false)}
        onStartHike={handleCreateHike}
        trailName={trail?.name}
        placeName={place?.name}
        distance={trail?.distance_miles}
        difficulty={trail?.difficulty}
        elevationGain={trail?.elevation_gain_feet}
        estimatedTime={trail?.estimated_duration_minutes}
        trailId={trail?.id}
        weather={weather}
        loading={creating}
      />
    </div>
  );
}

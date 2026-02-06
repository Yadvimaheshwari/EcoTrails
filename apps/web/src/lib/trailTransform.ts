/**
 * Data transformation utilities for trails
 * Maps backend API response format to frontend format
 */

import { getTrailDisplayName } from './formatting';

export interface BackendTrail {
  id?: string;
  name?: string;
  title?: string;
  trail_name?: string;
  difficulty?: string;
  distance_miles?: number;
  distance?: number;
  elevation_gain_feet?: number;
  elevationGain?: number;
  elevation_gain?: number;
  estimated_duration_minutes?: number;
  estimatedTime?: number;
  estimated_time?: number;
  loop_type?: string;
  loopType?: string;
  surface?: string;
  description?: string;
  meta_data?: any;
  metadata?: any;
  conditions?: any;
  wildlife?: string[];
  vegetation?: string[];
  geology?: string[];
  history?: string[];
  safety?: string[];
  recentActivity?: any[];
  recent_activity?: any[];
  photos?: string[];
  tags?: string[];
  // Additional fields from Google Places fallback
  lat?: number;
  lng?: number;
  rating?: number;
  user_ratings_total?: number;
}

// Valid sources for trail data
export type TrailSource = 'database' | 'gemini_generated' | 'google_places_fallback' | 'none';

export interface FrontendTrail {
  id: string;
  name: string;
  difficulty: string;
  distance: number; // miles
  elevationGain: number; // feet
  estimatedTime: number; // hours
  loopType?: string;
  surface?: string;
  description?: string;
  conditions?: any;
  wildlife?: string[];
  vegetation?: string[];
  geology?: string[];
  history?: string[];
  safety?: string[];
  recentActivity?: any[];
  photos?: string[];
  tags?: string[];
  shade?: string;
  // Additional fields for fallback/trailhead data
  lat?: number;
  lng?: number;
  rating?: number;
  userRatingsTotal?: number;
  isTrailhead?: boolean;
  source?: TrailSource;
}

// Response metadata from API
export interface TrailsResponseMeta {
  place_id?: string;
  place_name?: string;
  lat?: number;
  lng?: number;
  count?: number;
  provider_used?: string;
  reason_for_fallback?: string;
  api_key_configured?: boolean;
  google_maps_key_configured?: boolean;
  has_coordinates?: boolean;
}

export interface TrailsApiResponse {
  trails: BackendTrail[];
  source: TrailSource;
  meta?: TrailsResponseMeta;
}

/**
 * Transform backend trail data to frontend format
 * Handles multiple field name variations and converts units
 */
export function transformTrail(
  trail: BackendTrail,
  index?: number,
  parkName?: string,
  source?: TrailSource
): FrontendTrail {
  // Extract distance in miles (may be null for fallback trails)
  const distanceMiles =
    trail.distance_miles ??
    trail.distance ??
    0;

  // Extract elevation in feet (may be null for fallback trails)
  const elevationFeet =
    trail.elevation_gain_feet ??
    trail.elevationGain ??
    trail.elevation_gain ??
    0;

  // Extract duration and convert to hours (may be null for fallback trails)
  const durationMinutes =
    trail.estimated_duration_minutes ??
    (trail.estimatedTime ? trail.estimatedTime * 60 : null) ??
    (trail.estimated_time ? trail.estimated_time * 60 : null) ??
    0;

  const estimatedHours = durationMinutes / 60;

  // Extract loop type
  const loopType =
    trail.loop_type ??
    trail.loopType ??
    undefined;

  // Extract name using intelligent fallback
  const name = getTrailDisplayName(trail, index, parkName);

  // Extract difficulty with fallback (unknown for fallback trails)
  const difficulty = trail.difficulty?.toLowerCase() || 'unknown';

  // Extract metadata
  const metadata = trail.meta_data ?? trail.metadata ?? {};
  
  // Check if this is a trailhead from Google Places fallback
  const isTrailhead = metadata.is_trailhead === true || source === 'google_places_fallback';

  return {
    id: trail.id ?? `trail-${index ?? 0}`,
    name,
    difficulty,
    distance: distanceMiles,
    elevationGain: elevationFeet,
    estimatedTime: estimatedHours,
    loopType,
    surface: trail.surface ?? metadata.surface ?? (isTrailhead ? undefined : 'Mixed'),
    description: trail.description,
    conditions: trail.conditions,
    wildlife: trail.wildlife ?? metadata.wildlife,
    vegetation: trail.vegetation ?? metadata.vegetation,
    geology: trail.geology ?? metadata.geology,
    history: trail.history ?? metadata.history,
    safety: trail.safety ?? metadata.safety,
    recentActivity: trail.recentActivity ?? trail.recent_activity,
    photos: trail.photos ?? metadata.photos,
    tags: trail.tags ?? metadata.tags,
    shade: metadata.shade ?? (isTrailhead ? undefined : 'Moderate'),
    // Additional fields for fallback/trailhead data
    lat: trail.lat,
    lng: trail.lng,
    rating: trail.rating,
    userRatingsTotal: trail.user_ratings_total,
    isTrailhead,
    source,
  };
}

/**
 * Transform array of backend trails to frontend format
 */
export function transformTrails(
  trails: BackendTrail[],
  parkName?: string,
  source?: TrailSource
): FrontendTrail[] {
  if (!Array.isArray(trails)) {
    console.warn('[trailTransform] transformTrails received non-array:', trails);
    return [];
  }

  return trails.map((trail, index) => transformTrail(trail, index, parkName, source));
}

/**
 * Extract trail data and metadata from various API response shapes
 * Returns both the trails array and the source/meta information
 */
export function extractTrailsFromResponse(response: any): {
  trails: BackendTrail[];
  source: TrailsApiResponse['source'];
  meta?: TrailsResponseMeta;
} {
  const emptyResult = { trails: [], source: 'none' as const, meta: undefined };
  
  if (!response) {
    console.warn('[trailTransform] extractTrailsFromResponse received null/undefined');
    return emptyResult;
  }

  // New format: { trails: [], source: 'xxx', meta: {} }
  if (response.data?.trails !== undefined && response.data?.source !== undefined) {
    console.log('[trailTransform] Extracted from response.data (new format):', {
      count: response.data.trails.length,
      source: response.data.source,
      meta: response.data.meta
    });
    return {
      trails: response.data.trails,
      source: response.data.source,
      meta: response.data.meta
    };
  }

  // New format directly on response
  if (response.trails !== undefined && response.source !== undefined) {
    console.log('[trailTransform] Extracted from response (new format):', {
      count: response.trails.length,
      source: response.source,
      meta: response.meta
    });
    return {
      trails: response.trails,
      source: response.source,
      meta: response.meta
    };
  }

  // Legacy format: Direct array
  if (Array.isArray(response)) {
    console.log('[trailTransform] Legacy format: direct array, count:', response.length);
    return { trails: response, source: 'database' as const, meta: undefined };
  }

  // Legacy format: Nested in data.trails (without source)
  if (response.data?.trails) {
    console.log('[trailTransform] Legacy format: data.trails, count:', response.data.trails.length);
    return { trails: response.data.trails, source: 'database' as const, meta: undefined };
  }

  // Legacy format: Nested in trails (without source)
  if (response.trails) {
    console.log('[trailTransform] Legacy format: trails, count:', response.trails.length);
    return { trails: response.trails, source: 'database' as const, meta: undefined };
  }

  // Single trail wrapped in data
  if (response.data && !Array.isArray(response.data) && (response.data.id || response.data.name)) {
    console.log('[trailTransform] Single trail in data');
    return { trails: [response.data], source: 'database' as const, meta: undefined };
  }

  // Single trail
  if (response.id || response.name || response.trail_name) {
    console.log('[trailTransform] Single trail object');
    return { trails: [response], source: 'database' as const, meta: undefined };
  }

  console.warn('[trailTransform] Unable to extract trails from response:', response);
  return emptyResult;
}

/**
 * Validation utilities for data normalization and safety checks
 * Critical for preventing /places/undefined bugs and data contract issues
 */

// ============================================
// Response Validation (Zod-style validation)
// ============================================

/**
 * Schema for single hike response validation
 */
export const HikeResponseSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
    user_id: { type: 'string' },
    trail_id: { type: 'string' },
    place_id: { type: 'string' },
    status: { type: 'string' },
    start_time: { type: 'string' },
    end_time: { type: 'string' },
    distance_miles: { type: 'number' },
    duration_minutes: { type: 'number' },
    elevation_gain_feet: { type: 'number' },
    trail: { type: 'object' },
    route_points: { type: 'array' },
    discoveries: { type: 'array' },
    media: { type: 'array' },
  },
};

/**
 * Schema for hikes list response validation
 */
export const HikesResponseSchema = {
  type: 'object',
  properties: {
    hikes: { type: 'array' },
  },
};

/**
 * Schema for journal entries response validation
 */
export const JournalEntriesResponseSchema = {
  type: 'object',
  properties: {
    entries: { type: 'array' },
  },
};

/**
 * Schema for media response validation
 */
export const MediaResponseSchema = {
  type: 'object',
  properties: {
    media: { type: 'array' },
  },
};

/**
 * Schema for places response validation
 */
export const PlacesResponseSchema = {
  type: 'object',
  properties: {
    places: { type: 'array' },
  },
};

/**
 * Validate API response against a schema
 * Returns the data if valid, otherwise returns a default object with the data
 * This is a lightweight validation that logs warnings but doesn't throw
 * 
 * @param schema - Schema object (not currently enforced, for documentation)
 * @param data - Response data to validate
 * @param context - Description for logging
 * @returns Validation result with success flag and data (preserves original structure)
 */
export function validateResponse<T = any>(
  schema: any,
  data: any,
  context: string = 'API response'
): { success: boolean; data: T | null; error?: string } {
  // Handle null/undefined
  if (data === null || data === undefined) {
    console.warn(`[validation] ${context}: received null/undefined`);
    return { success: false, data: null, error: 'No data received' };
  }

  // Basic type check for objects
  if (typeof data !== 'object') {
    console.warn(`[validation] ${context}: expected object, got ${typeof data}`);
    return { success: false, data: null, error: `Expected object, got ${typeof data}` };
  }

  // Check for id in nested data structure (common API pattern: { data: { id: ... } })
  const nestedData = data?.data;
  if (schema?.required?.includes('id')) {
    const hasId = data.id || nestedData?.id;
    if (!hasId) {
      console.warn(`[validation] ${context}: missing required 'id' field`);
      // Don't fail - just warn. Return data anyway for graceful degradation.
    }
  }

  // Return the data as-is, preserving original structure
  return { success: true, data: data as T };
}

// ============================================
// Radius Conversion
// ============================================

// Radius conversion constants
const MILES_TO_METERS = 1609.34;
const KM_TO_METERS = 1000;
const DEFAULT_RADIUS_METERS = 5000; // 5km
const MIN_RADIUS_METERS = 100;
const MAX_RADIUS_METERS = 50000; // 50km

/**
 * Normalize radius to meters with clamping
 * @param value - Radius value
 * @param unit - Unit: 'mi' for miles, 'km' for kilometers, default is meters
 * @returns Radius in meters, clamped to valid range
 */
export function normalizeRadius(value: number, unit: 'mi' | 'km' | 'm' = 'm'): number {
  // Handle invalid inputs
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_RADIUS_METERS;
  }

  // Convert to meters
  let meters: number;
  switch (unit) {
    case 'mi':
      meters = value * MILES_TO_METERS;
      break;
    case 'km':
      meters = value * KM_TO_METERS;
      break;
    default:
      meters = value;
  }

  // Clamp to valid range
  return Math.min(MAX_RADIUS_METERS, Math.max(MIN_RADIUS_METERS, Math.round(meters)));
}

/**
 * Extract and validate place ID from various object formats
 * CRITICAL: Prevents /places/undefined navigation bugs
 * 
 * @param place - Object potentially containing place ID
 * @returns Normalized place ID or null if invalid
 */
export function normalizePlaceId(place: any): string | null {
  if (!place) {
    return null;
  }

  // Try various field names in order of preference
  const candidates = [
    place.id,
    place.place_id,
    place.google_place_id,
    place.placeId,
  ];

  for (const candidate of candidates) {
    if (isValidPlaceId(candidate)) {
      return candidate.trim();
    }
  }

  return null;
}

/**
 * Check if a place ID is valid
 * Rejects: null, undefined, 'undefined', 'null', empty strings, whitespace-only
 * 
 * @param placeId - Place ID to validate
 * @returns true if valid
 */
export function isValidPlaceId(placeId: any): boolean {
  if (placeId === null || placeId === undefined) {
    return false;
  }

  if (typeof placeId !== 'string') {
    return false;
  }

  const trimmed = placeId.trim();
  
  // Check for invalid strings
  if (
    trimmed === '' ||
    trimmed === 'undefined' ||
    trimmed === 'null'
  ) {
    return false;
  }

  return true;
}

/**
 * Extract and validate coordinates from various location formats
 * 
 * @param location - Location object or string
 * @returns Normalized coordinates or null if invalid
 */
export function extractCoordinates(
  location: any
): { lat: number; lng: number } | null {
  if (!location) {
    return null;
  }

  // Handle string locations (can't extract coords from string)
  if (typeof location === 'string') {
    return null;
  }

  // Try various field name combinations
  const lat = location.lat ?? location.latitude;
  const lng = location.lng ?? location.longitude ?? location.lon;

  // Validate coordinates
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  // Validate ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng };
}

/**
 * Normalize a place object to ensure it has a valid ID
 * Returns null if place cannot be normalized
 * 
 * @param place - Place object to normalize
 * @returns Normalized place or null
 */
export function normalizePlace(place: any): any | null {
  if (!place) {
    return null;
  }

  const placeId = normalizePlaceId(place);
  if (!placeId) {
    console.warn('[validation] Invalid place ID detected:', place?.name);
    return null;
  }
      
      return {
    ...place,
    id: placeId, // Ensure 'id' field is always set
  };
}

/**
 * Filter an array of places to only include valid ones
 * 
 * @param places - Array of place objects
 * @returns Array of valid places with normalized IDs
 */
export function filterValidPlaces(places: any[]): any[] {
  if (!Array.isArray(places)) {
    return [];
  }

  return places
    .map(normalizePlace)
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

/**
 * Safe parse of JSON that returns null on error
 */
export function safeJsonParse<T = any>(json: string, fallback: T | null = null): T | null {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

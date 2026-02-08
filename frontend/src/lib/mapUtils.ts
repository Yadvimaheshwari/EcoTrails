/**
 * Map utility functions for trail rendering and geometry handling
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Decode a Google Maps encoded polyline string
 * @param encoded - Encoded polyline string
 * @returns Array of lat/lng coordinates
 */
export function decodePolyline(encoded: string): LatLng[] {
  if (!encoded) return [];

  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return points;
}

/**
 * Calculate bounds from an array of coordinates
 * @param coordinates - Array of lat/lng points
 * @returns Bounds object
 */
export function getBoundsFromCoordinates(coordinates: LatLng[]): Bounds | null {
  if (!coordinates || coordinates.length === 0) return null;

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  coordinates.forEach((point) => {
    if (point.lat > north) north = point.lat;
    if (point.lat < south) south = point.lat;
    if (point.lng > east) east = point.lng;
    if (point.lng < west) west = point.lng;
  });

  // Add padding (5%)
  const latPadding = (north - south) * 0.05;
  const lngPadding = (east - west) * 0.05;

  return {
    north: north + latPadding,
    south: south - latPadding,
    east: east + lngPadding,
    west: west - lngPadding,
  };
}

/**
 * Extract coordinates from various trail geometry formats
 * @param trail - Trail object with potential geometry data
 * @returns Array of coordinates or null
 */
export function extractTrailCoordinates(trail: any): LatLng[] | null {
  if (!trail) return null;

  // Try encoded polyline
  if (trail.polyline && typeof trail.polyline === 'string') {
    return decodePolyline(trail.polyline);
  }

  // Try encoded_polyline
  if (trail.encoded_polyline && typeof trail.encoded_polyline === 'string') {
    return decodePolyline(trail.encoded_polyline);
  }

  // Try geometry.coordinates (GeoJSON LineString)
  if (trail.geometry?.coordinates && Array.isArray(trail.geometry.coordinates)) {
    return trail.geometry.coordinates.map((coord: number[]) => ({
      lng: coord[0],
      lat: coord[1],
    }));
  }

  // Try coordinates array
  if (trail.coordinates && Array.isArray(trail.coordinates)) {
    return trail.coordinates;
  }

  // Try path
  if (trail.path && Array.isArray(trail.path)) {
    return trail.path;
  }

  // Try metadata
  if (trail.meta_data?.geometry || trail.metadata?.geometry) {
    const metadata = trail.meta_data || trail.metadata;
    if (metadata.geometry?.coordinates) {
      return metadata.geometry.coordinates.map((coord: number[]) => ({
        lng: coord[0],
        lat: coord[1],
      }));
    }
  }

  return null;
}

/**
 * Get difficulty color for trail rendering
 * @param difficulty - Trail difficulty string
 * @returns Hex color code
 */
export function getDifficultyColor(difficulty?: string): string {
  const normalized = difficulty?.toLowerCase() || 'moderate';

  const colorMap: Record<string, string> = {
    easy: '#10b981', // green
    moderate: '#f59e0b', // orange
    hard: '#ef4444', // red
    expert: '#dc2626', // dark red
  };

  return colorMap[normalized] || colorMap.moderate;
}

/**
 * Calculate center point from array of coordinates
 * @param coordinates - Array of lat/lng points
 * @returns Center point
 */
export function getCenterFromCoordinates(coordinates: LatLng[]): LatLng | null {
  if (!coordinates || coordinates.length === 0) return null;

  const sum = coordinates.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat,
      lng: acc.lng + point.lng,
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / coordinates.length,
    lng: sum.lng / coordinates.length,
  };
}

/**
 * Debounce function for performance optimization
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if coordinates are valid
 * @param coords - Coordinates to check
 * @returns True if valid
 */
export function areCoordinatesValid(coords: LatLng[]): boolean {
  if (!coords || !Array.isArray(coords) || coords.length === 0) {
    return false;
  }

  return coords.every(
    (point) =>
      point &&
      typeof point.lat === 'number' &&
      typeof point.lng === 'number' &&
      !isNaN(point.lat) &&
      !isNaN(point.lng) &&
      point.lat >= -90 &&
      point.lat <= 90 &&
      point.lng >= -180 &&
      point.lng <= 180
  );
}

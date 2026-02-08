/**
 * Geographic Utility Functions
 * Haversine distance, coordinate validation, and proximity calculations
 */

/**
 * Calculate Haversine distance between two coordinates in meters
 * Uses the Haversine formula for great-circle distance
 */
export function haversineDistanceMeters(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = toRadians(point1.lat);
  const lat2 = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate Haversine distance in miles
 */
export function haversineDistanceMiles(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  return haversineDistanceMeters(point1, point2) / 1609.344;
}

/**
 * Calculate Haversine distance in feet
 */
export function haversineDistanceFeet(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  return haversineDistanceMeters(point1, point2) * 3.28084;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a point is within a radius (in meters) of another point
 */
export function isWithinRadius(
  point: { lat: number; lng: number },
  center: { lat: number; lng: number },
  radiusMeters: number
): boolean {
  const distance = haversineDistanceMeters(point, center);
  return distance <= radiusMeters;
}

/**
 * Sort points by distance from a reference point
 */
export function sortByDistance<T extends { lat: number; lng: number }>(
  points: T[],
  reference: { lat: number; lng: number }
): (T & { distanceMeters: number })[] {
  return points
    .map((point) => ({
      ...point,
      distanceMeters: haversineDistanceMeters(reference, point),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

/**
 * Get bounding box around a point with given radius in meters
 */
export function getBoundingBox(
  center: { lat: number; lng: number },
  radiusMeters: number
): { north: number; south: number; east: number; west: number } {
  // Approximate degrees per meter at given latitude
  const latDegPerMeter = 1 / 111320;
  const lngDegPerMeter = 1 / (111320 * Math.cos(toRadians(center.lat)));

  const latDelta = radiusMeters * latDegPerMeter;
  const lngDelta = radiusMeters * lngDegPerMeter;

  return {
    north: center.lat + latDelta,
    south: center.lat - latDelta,
    east: center.lng + lngDelta,
    west: center.lng - lngDelta,
  };
}

/**
 * Check if coordinates are valid
 */
export function isValidCoordinate(coord: { lat?: number; lng?: number } | null | undefined): boolean {
  if (!coord) return false;
  if (typeof coord.lat !== 'number' || typeof coord.lng !== 'number') return false;
  if (isNaN(coord.lat) || isNaN(coord.lng)) return false;
  if (coord.lat < -90 || coord.lat > 90) return false;
  if (coord.lng < -180 || coord.lng > 180) return false;
  return true;
}

/**
 * Get the center point of multiple coordinates
 */
export function getCenterPoint(
  points: Array<{ lat: number; lng: number }>
): { lat: number; lng: number } | null {
  if (!points || points.length === 0) return null;

  const sum = points.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat,
      lng: acc.lng + point.lng,
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length,
  };
}

/**
 * Calculate bearing between two points in degrees (0-360)
 */
export function calculateBearing(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  const x = Math.sin(deltaLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  const bearing = Math.atan2(x, y);
  return (toDegrees(bearing) + 360) % 360;
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Get compass direction from bearing
 */
export function getCompassDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Format distance for display
 */
export function formatDistanceForDisplay(meters: number): string {
  if (meters < 100) {
    return `${Math.round(meters)} m`;
  } else if (meters < 1000) {
    return `${Math.round(meters / 10) * 10} m`;
  } else if (meters < 1609.344) {
    return `${(meters / 1000).toFixed(1)} km`;
  } else {
    const miles = meters / 1609.344;
    if (miles < 10) {
      return `${miles.toFixed(1)} mi`;
    }
    return `${Math.round(miles)} mi`;
  }
}

/**
 * Format distance in feet for short distances
 */
export function formatDistanceFeet(meters: number): string {
  const feet = meters * 3.28084;
  if (feet < 100) {
    return `${Math.round(feet)} ft`;
  } else if (feet < 5280) {
    return `${Math.round(feet / 10) * 10} ft`;
  } else {
    const miles = feet / 5280;
    return `${miles.toFixed(1)} mi`;
  }
}

/**
 * Simulate location movement along a route (for dev mode)
 */
export function interpolateRoute(
  route: Array<{ lat: number; lng: number }>,
  progress: number // 0 to 1
): { lat: number; lng: number } | null {
  if (!route || route.length < 2) return null;
  if (progress <= 0) return route[0];
  if (progress >= 1) return route[route.length - 1];

  // Calculate total route length
  let totalLength = 0;
  const segmentLengths: number[] = [];

  for (let i = 0; i < route.length - 1; i++) {
    const segmentLength = haversineDistanceMeters(route[i], route[i + 1]);
    segmentLengths.push(segmentLength);
    totalLength += segmentLength;
  }

  // Find position at progress
  const targetDistance = totalLength * progress;
  let accumulatedDistance = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    if (accumulatedDistance + segmentLengths[i] >= targetDistance) {
      // Interpolate within this segment
      const segmentProgress =
        (targetDistance - accumulatedDistance) / segmentLengths[i];
      
      return {
        lat: route[i].lat + (route[i + 1].lat - route[i].lat) * segmentProgress,
        lng: route[i].lng + (route[i + 1].lng - route[i].lng) * segmentProgress,
      };
    }
    accumulatedDistance += segmentLengths[i];
  }

  return route[route.length - 1];
}

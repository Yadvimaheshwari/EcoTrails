/**
 * Geographic Utility Functions (Mobile)
 * Haversine distance, proximity checks, coordinate helpers
 */

/**
 * Calculate Haversine distance between two coordinates in meters
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
 * Format distance for display
 */
export function formatDistanceForDisplay(meters: number): string {
  if (meters < 100) {
    return `${Math.round(meters)} m`;
  } else if (meters < 1000) {
    return `${Math.round(meters / 10) * 10} m`;
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
 * Interpolate position along a route based on progress (0-1)
 */
export function interpolateRoute(
  route: Array<{ lat: number; lng: number }>,
  progress: number
): { lat: number; lng: number } | null {
  if (!route || route.length < 2) return null;
  if (progress <= 0) return route[0];
  if (progress >= 1) return route[route.length - 1];

  let totalLength = 0;
  const segmentLengths: number[] = [];

  for (let i = 0; i < route.length - 1; i++) {
    const segmentLength = haversineDistanceMeters(route[i], route[i + 1]);
    segmentLengths.push(segmentLength);
    totalLength += segmentLength;
  }

  const targetDistance = totalLength * progress;
  let accumulatedDistance = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    if (accumulatedDistance + segmentLengths[i] >= targetDistance) {
      const segmentProgress = (targetDistance - accumulatedDistance) / segmentLengths[i];

      return {
        lat: route[i].lat + (route[i + 1].lat - route[i].lat) * segmentProgress,
        lng: route[i].lng + (route[i + 1].lng - route[i].lng) * segmentProgress,
      };
    }
    accumulatedDistance += segmentLengths[i];
  }

  return route[route.length - 1];
}

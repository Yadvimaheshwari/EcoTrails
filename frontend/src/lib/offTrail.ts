/**
 * Off-Trail Detection
 * Simple algorithm to detect if user has wandered off the trail
 */

export interface TrailPoint {
  lat: number;
  lng: number;
  elevation?: number;
}

export interface OffTrailResult {
  isOffTrail: boolean;
  distanceFromTrail: number; // meters
  nearestPoint?: TrailPoint;
  message?: string;
}

const OFF_TRAIL_THRESHOLD_METERS = 50; // 50 meters
const WARNING_THRESHOLD_METERS = 30; // 30 meters

/**
 * Calculate distance between two GPS points using Haversine formula
 * Returns distance in meters
 */
function haversineDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Find the closest point on the trail to the user's current location
 */
function findNearestTrailPoint(
  currentLocation: { lat: number; lng: number },
  trailPoints: TrailPoint[]
): { point: TrailPoint; distance: number } | null {
  if (!trailPoints || trailPoints.length === 0) return null;

  let minDistance = Infinity;
  let nearestPoint: TrailPoint | null = null;

  for (const point of trailPoints) {
    const distance = haversineDistance(currentLocation, point);
    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = point;
    }
  }

  return nearestPoint ? { point: nearestPoint, distance: minDistance } : null;
}

/**
 * Check if the user is off the trail
 */
export function checkOffTrail(
  currentLocation: { lat: number; lng: number },
  trailPoints: TrailPoint[]
): OffTrailResult {
  if (!currentLocation || !trailPoints || trailPoints.length === 0) {
    return {
      isOffTrail: false,
      distanceFromTrail: 0,
      message: 'Trail data unavailable',
    };
  }

  const nearest = findNearestTrailPoint(currentLocation, trailPoints);

  if (!nearest) {
    return {
      isOffTrail: false,
      distanceFromTrail: 0,
      message: 'Unable to determine position',
    };
  }

  const isOffTrail = nearest.distance > OFF_TRAIL_THRESHOLD_METERS;
  const isWarning = nearest.distance > WARNING_THRESHOLD_METERS;

  let message: string | undefined;
  if (isOffTrail) {
    message = `You appear to be ${Math.round(nearest.distance)}m off trail`;
  } else if (isWarning) {
    message = `Getting close to trail edge (${Math.round(nearest.distance)}m)`;
  }

  return {
    isOffTrail,
    distanceFromTrail: nearest.distance,
    nearestPoint: nearest.point,
    message,
  };
}

/**
 * Calculate total distance covered along a path
 * Returns distance in miles
 */
export function calculatePathDistance(points: TrailPoint[]): number {
  if (!points || points.length < 2) return 0;

  let totalMeters = 0;
  for (let i = 1; i < points.length; i++) {
    totalMeters += haversineDistance(points[i - 1], points[i]);
  }

  // Convert meters to miles
  return totalMeters / 1609.34;
}

/**
 * Calculate elevation gain along a path
 * Returns elevation gain in feet
 */
export function calculateElevationGain(points: TrailPoint[]): number {
  if (!points || points.length < 2) return 0;

  let totalGain = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    
    if (prev.elevation !== undefined && curr.elevation !== undefined) {
      const gain = curr.elevation - prev.elevation;
      if (gain > 0) {
        totalGain += gain;
      }
    }
  }

  return totalGain;
}

/**
 * Get GPS accuracy status
 */
export function getGPSAccuracyStatus(accuracy?: number): {
  status: 'good' | 'ok' | 'poor';
  message: string;
  icon: string;
} {
  if (!accuracy) {
    return {
      status: 'ok',
      message: 'GPS active',
      icon: '📍',
    };
  }

  if (accuracy <= 10) {
    return {
      status: 'good',
      message: `±${Math.round(accuracy)}m`,
      icon: '🎯',
    };
  } else if (accuracy <= 50) {
    return {
      status: 'ok',
      message: `±${Math.round(accuracy)}m`,
      icon: '📍',
    };
  } else {
    return {
      status: 'poor',
      message: `±${Math.round(accuracy)}m`,
      icon: '⚠️',
    };
  }
}

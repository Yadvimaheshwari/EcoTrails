/**
 * Safe formatting utilities for trail data
 * Handles undefined, null, and invalid numeric values gracefully
 * 
 * IMPORTANT: All formatters return '–' for missing/invalid values.
 * Never call .toFixed() or other methods on potentially undefined values.
 */

/**
 * Format distance in miles with defensive checks
 * @param value - Distance value (can be number, string, null, or undefined)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string or '–' fallback
 */
export function formatMiles(
  value?: number | string | null,
  decimals: number = 1
): string {
  if (value === null || value === undefined || value === '') {
    return '–';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || num < 0) {
    return '–';
  }

  return num.toFixed(decimals);
}

/**
 * Format time in minutes with defensive checks
 * @param value - Time value in minutes (can be number, string, null, or undefined)
 * @returns Formatted string or '–' fallback
 */
export function formatTime(value?: number | string | null): string {
  if (value === null || value === undefined || value === '') {
    return '–';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || num < 0) {
    return '–';
  }

  // Convert to hours/minutes display
  if (num < 60) {
    return `${Math.round(num)} min`;
  }

  const hours = Math.floor(num / 60);
  const minutes = Math.round(num % 60);

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours}h ${minutes}m`;
}

/**
 * Format elevation in feet with defensive checks
 * @param value - Elevation value (can be number, string, null, or undefined)
 * @returns Formatted string with commas or fallback
 */
export function formatFeet(value?: number | string | null): string {
  if (value === null || value === undefined || value === '') {
    return '–';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || num < 0) {
    return '–';
  }

  return Math.round(num).toLocaleString();
}

/**
 * Format time in hours with defensive checks
 * @param value - Time value in hours (can be number, string, null, or undefined)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string or fallback
 */
export function formatHours(
  value?: number | string | null,
  decimals: number = 1
): string {
  if (value === null || value === undefined || value === '') {
    return '–';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || num < 0) {
    return '–';
  }

  return num.toFixed(decimals);
}

/**
 * Format time intelligently (hours/minutes based on duration)
 * @param hours - Time value in hours
 * @returns Formatted string with appropriate unit
 */
export function formatDuration(hours?: number | string | null): string {
  if (hours === null || hours === undefined || hours === '') {
    return '–';
  }

  const num = typeof hours === 'string' ? parseFloat(hours) : hours;

  if (isNaN(num) || num < 0) {
    return '–';
  }

  if (num < 1) {
    const minutes = Math.round(num * 60);
    return `${minutes} min`;
  }

  return `${num.toFixed(1)} hr`;
}

/**
 * Safe get with fallback
 * @param obj - Object to access
 * @param path - Dot-notation path (e.g., 'user.name')
 * @param fallback - Fallback value
 * @returns Value or fallback
 */
export function safeGet<T = any>(
  obj: any,
  path: string,
  fallback: T = '–' as any
): T {
  if (!obj || !path) return fallback;

  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return fallback;
    }
    result = result[key];
  }

  return result !== null && result !== undefined ? result : fallback;
}

/**
 * Check if a value is truly empty (null, undefined, empty string, 0)
 */
export function isEmpty(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'number' && value === 0)
  );
}

/**
 * Get display name for trail with fallback strategy
 */
export function getTrailDisplayName(
  trail: any,
  index?: number,
  parkName?: string
): string {
  // Try various common field names
  if (trail?.name && typeof trail.name === 'string' && trail.name.trim()) {
    return trail.name.trim();
  }

  if (trail?.title && typeof trail.title === 'string' && trail.title.trim()) {
    return trail.title.trim();
  }

  if (trail?.trail_name && typeof trail.trail_name === 'string' && trail.trail_name.trim()) {
    return trail.trail_name.trim();
  }

  if (trail?.displayName && typeof trail.displayName === 'string' && trail.displayName.trim()) {
    return trail.displayName.trim();
  }

  // Fallback naming strategy
  if (parkName && index !== undefined) {
    return `${parkName} Trail ${index + 1}`;
  }

  if (index !== undefined) {
    return `Trail ${index + 1}`;
  }

  return 'Unnamed Trail';
}

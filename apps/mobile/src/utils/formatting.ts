/**
 * Safe Formatting Utilities (Mobile)
 * Handles undefined, null, and invalid values gracefully
 */

/**
 * Format distance in miles with defensive checks
 */
export function formatMiles(value?: number | string | null, decimals: number = 1): string {
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
 */
export function formatTime(value?: number | string | null): string {
  if (value === null || value === undefined || value === '') {
    return '–';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || num < 0) {
    return '–';
  }

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
 * Format duration intelligently (hours/minutes based on duration)
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
 * Format elapsed time in seconds to display string
 */
export function formatElapsedTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

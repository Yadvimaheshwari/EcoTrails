/**
 * Centralized environment configuration
 * All environment variables should be accessed through this file
 */

/**
 * Google Maps API Key
 * REQUIRED: Must be set in .env.local as NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * The NEXT_PUBLIC_ prefix is required for browser-side access in Next.js
 */
export const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

/**
 * Check if Google Maps key is configured
 */
export const hasGoogleMapsKey = (): boolean => {
  return GOOGLE_MAPS_KEY.length > 0;
};

/**
 * Development mode flag
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * API Base URL
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

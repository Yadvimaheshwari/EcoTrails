/**
 * Tests for validation utilities
 * Critical for preventing /places/undefined bugs
 */

import {
  normalizeRadius,
  normalizePlaceId,
  isValidPlaceId,
  extractCoordinates,
} from '../validation';

describe('normalizeRadius', () => {
  it('should convert miles to meters', () => {
    // 1 mile = 1609.34 meters
    expect(normalizeRadius(1, 'mi')).toBeCloseTo(1609.34, 0);
    expect(normalizeRadius(10, 'mi')).toBeCloseTo(16093.4, 0);
    expect(normalizeRadius(31, 'mi')).toBeCloseTo(49890, 0);
  });

  it('should handle kilometers', () => {
    expect(normalizeRadius(1, 'km')).toBe(1000);
    expect(normalizeRadius(50, 'km')).toBe(50000);
  });

  it('should default to meters when no unit specified', () => {
    expect(normalizeRadius(5000)).toBe(5000);
  });

  it('should clamp to max radius', () => {
    expect(normalizeRadius(100, 'mi')).toBe(50000); // Max 50km
    expect(normalizeRadius(100000)).toBe(50000);
  });

  it('should clamp to min radius', () => {
    expect(normalizeRadius(0.01, 'mi')).toBe(100); // Min 100m
    expect(normalizeRadius(10)).toBe(100);
  });

  it('should handle invalid values', () => {
    expect(normalizeRadius(NaN)).toBe(5000); // Default
    expect(normalizeRadius(-5)).toBe(5000);
    expect(normalizeRadius(Infinity)).toBe(50000);
  });
});

describe('normalizePlaceId', () => {
  it('should return id when present', () => {
    expect(normalizePlaceId({ id: 'abc123' })).toBe('abc123');
  });

  it('should fallback to place_id', () => {
    expect(normalizePlaceId({ place_id: 'def456' })).toBe('def456');
  });

  it('should fallback to google_place_id', () => {
    expect(normalizePlaceId({ google_place_id: 'ChIJ123' })).toBe('ChIJ123');
  });

  it('should prefer id over others', () => {
    expect(normalizePlaceId({ 
      id: 'primary', 
      place_id: 'secondary',
      google_place_id: 'tertiary'
    })).toBe('primary');
  });

  it('should return null for undefined string values', () => {
    expect(normalizePlaceId({ id: 'undefined' })).toBeNull();
    expect(normalizePlaceId({ place_id: 'null' })).toBeNull();
  });

  it('should return null for empty objects', () => {
    expect(normalizePlaceId({})).toBeNull();
  });

  it('should return null for null/undefined input', () => {
    expect(normalizePlaceId(null)).toBeNull();
    expect(normalizePlaceId(undefined)).toBeNull();
  });

  it('should trim whitespace', () => {
    expect(normalizePlaceId({ id: '  abc123  ' })).toBe('abc123');
  });

  it('should reject whitespace-only values', () => {
    expect(normalizePlaceId({ id: '   ' })).toBeNull();
  });
});

describe('isValidPlaceId', () => {
  it('should accept valid place IDs', () => {
    expect(isValidPlaceId('abc123')).toBe(true);
    expect(isValidPlaceId('ChIJxyz789')).toBe(true);
    expect(isValidPlaceId('valid-place-id-123')).toBe(true);
  });

  it('should reject undefined string', () => {
    expect(isValidPlaceId('undefined')).toBe(false);
  });

  it('should reject null string', () => {
    expect(isValidPlaceId('null')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidPlaceId('')).toBe(false);
  });

  it('should reject whitespace-only', () => {
    expect(isValidPlaceId('   ')).toBe(false);
  });

  it('should reject actual null/undefined', () => {
    expect(isValidPlaceId(null as any)).toBe(false);
    expect(isValidPlaceId(undefined as any)).toBe(false);
  });
});

describe('extractCoordinates', () => {
  it('should extract from object with lat/lng', () => {
    const coords = extractCoordinates({ lat: 37.7749, lng: -122.4194 });
    expect(coords).toEqual({ lat: 37.7749, lng: -122.4194 });
  });

  it('should extract from object with latitude/longitude', () => {
    const coords = extractCoordinates({ latitude: 37.7749, longitude: -122.4194 });
    expect(coords).toEqual({ lat: 37.7749, lng: -122.4194 });
  });

  it('should return null for string location', () => {
    expect(extractCoordinates('San Francisco, CA')).toBeNull();
  });

  it('should return null for invalid coordinates', () => {
    expect(extractCoordinates({ lat: 'invalid', lng: -122 })).toBeNull();
    expect(extractCoordinates({ lat: 91, lng: -122 })).toBeNull(); // lat > 90
    expect(extractCoordinates({ lat: 37, lng: 181 })).toBeNull(); // lng > 180
  });

  it('should return null for null/undefined', () => {
    expect(extractCoordinates(null)).toBeNull();
    expect(extractCoordinates(undefined)).toBeNull();
  });

  it('should return null for empty object', () => {
    expect(extractCoordinates({})).toBeNull();
  });
});

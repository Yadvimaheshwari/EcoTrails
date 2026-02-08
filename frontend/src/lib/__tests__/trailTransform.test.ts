/**
 * Tests for trail transformation utilities
 */

import {
  transformTrail,
  transformTrails,
  extractTrailsFromResponse,
  BackendTrail,
} from '../trailTransform';

describe('transformTrail', () => {
  it('should transform backend trail with snake_case fields', () => {
    const backendTrail: BackendTrail = {
      id: 'trail-1',
      name: 'Eagle Peak',
      difficulty: 'hard',
      distance_miles: 8.5,
      elevation_gain_feet: 2500,
      estimated_duration_minutes: 300,
      loop_type: 'Out & Back',
      surface: 'Rocky',
    };

    const result = transformTrail(backendTrail);

    expect(result.id).toBe('trail-1');
    expect(result.name).toBe('Eagle Peak');
    expect(result.difficulty).toBe('hard');
    expect(result.distance).toBe(8.5);
    expect(result.elevationGain).toBe(2500);
    expect(result.estimatedTime).toBe(5); // 300 minutes = 5 hours
    expect(result.loopType).toBe('Out & Back');
    expect(result.surface).toBe('Rocky');
    expect(result.shade).toBe('Moderate');
    expect(result.isTrailhead).toBe(false);
  });

  it('should handle missing fields with defaults', () => {
    const backendTrail: BackendTrail = {
      id: 'trail-2',
    };

    const result = transformTrail(backendTrail, 1, 'Yosemite');

    expect(result.id).toBe('trail-2');
    expect(result.name).toBe('Yosemite Trail 2'); // Generated from park name + index
    expect(result.difficulty).toBe('unknown');
    expect(result.distance).toBe(0);
    expect(result.elevationGain).toBe(0);
    expect(result.estimatedTime).toBe(0);
    expect(result.surface).toBe('Mixed');
  });

  it('should handle camelCase fields (already transformed)', () => {
    const backendTrail: BackendTrail = {
      id: 'trail-3',
      name: 'Valley Loop',
      difficulty: 'easy',
      distance: 3.2,
      elevationGain: 150,
      estimatedTime: 1.5,
      loopType: 'Loop',
    };

    const result = transformTrail(backendTrail);

    expect(result.distance).toBe(3.2);
    expect(result.elevationGain).toBe(150);
    expect(result.estimatedTime).toBe(90); // 1.5 hours * 60 minutes = 90 minutes / 60 = 1.5 hours
  });

  it('should convert difficulty to lowercase', () => {
    expect(transformTrail({ difficulty: 'HARD' }).difficulty).toBe('hard');
    expect(transformTrail({ difficulty: 'Easy' }).difficulty).toBe('easy');
    expect(transformTrail({ difficulty: 'Moderate' }).difficulty).toBe('moderate');
    expect(transformTrail({}).difficulty).toBe('unknown'); // No difficulty = unknown
  });
  
  it('should mark Google Places fallback trails as trailheads', () => {
    const backendTrail: BackendTrail = {
      id: 'place-123',
      name: 'Half Dome Trailhead',
      lat: 37.7458,
      lng: -119.5332,
      rating: 4.7,
      user_ratings_total: 1234,
      meta_data: {
        is_trailhead: true,
        source: 'google_places_fallback'
      }
    };

    const result = transformTrail(backendTrail, 0, 'Yosemite', 'google_places_fallback');

    expect(result.isTrailhead).toBe(true);
    expect(result.source).toBe('google_places_fallback');
    expect(result.lat).toBe(37.7458);
    expect(result.lng).toBe(-119.5332);
    expect(result.rating).toBe(4.7);
    expect(result.userRatingsTotal).toBe(1234);
  });

  it('should extract metadata fields', () => {
    const backendTrail: BackendTrail = {
      id: 'trail-4',
      name: 'River Trail',
      meta_data: {
        surface: 'Paved',
        shade: 'Full',
        wildlife: ['Bears', 'Deer'],
        tags: ['popular', 'scenic'],
      },
    };

    const result = transformTrail(backendTrail);

    expect(result.surface).toBe('Paved');
    expect(result.shade).toBe('Full');
    expect(result.wildlife).toEqual(['Bears', 'Deer']);
    expect(result.tags).toEqual(['popular', 'scenic']);
  });

  it('should prefer direct fields over metadata', () => {
    const backendTrail: BackendTrail = {
      id: 'trail-5',
      name: 'Test Trail',
      surface: 'Rocky',
      meta_data: {
        surface: 'Paved',
      },
    };

    const result = transformTrail(backendTrail);

    expect(result.surface).toBe('Rocky'); // Direct field takes precedence
  });

  it('should handle various name field variations', () => {
    expect(transformTrail({ name: 'Name Field' }).name).toBe('Name Field');
    expect(transformTrail({ title: 'Title Field' }).name).toBe('Title Field');
    expect(transformTrail({ trail_name: 'Trail Name Field' }).name).toBe('Trail Name Field');
  });
});

describe('transformTrails', () => {
  it('should transform array of trails', () => {
    const backendTrails: BackendTrail[] = [
      {
        id: 'trail-1',
        name: 'Trail 1',
        distance_miles: 5,
        elevation_gain_feet: 1000,
        estimated_duration_minutes: 180,
      },
      {
        id: 'trail-2',
        name: 'Trail 2',
        distance_miles: 3,
        elevation_gain_feet: 500,
        estimated_duration_minutes: 120,
      },
    ];

    const results = transformTrails(backendTrails, 'Yosemite');

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Trail 1');
    expect(results[1].name).toBe('Trail 2');
  });

  it('should handle empty array', () => {
    expect(transformTrails([])).toEqual([]);
  });

  it('should handle non-array input gracefully', () => {
    expect(transformTrails(null as any)).toEqual([]);
    expect(transformTrails(undefined as any)).toEqual([]);
    expect(transformTrails({} as any)).toEqual([]);
  });

  it('should pass park name to each trail transformation', () => {
    const backendTrails: BackendTrail[] = [
      { id: 'trail-1' },
      { id: 'trail-2' },
    ];

    const results = transformTrails(backendTrails, 'Zion');

    expect(results[0].name).toBe('Zion Trail 1');
    expect(results[1].name).toBe('Zion Trail 2');
  });
});

describe('extractTrailsFromResponse', () => {
  it('should extract from direct array (legacy format)', () => {
    const response = [
      { id: 'trail-1', name: 'Trail 1' },
      { id: 'trail-2', name: 'Trail 2' },
    ];

    const result = extractTrailsFromResponse(response);

    expect(result.trails).toHaveLength(2);
    expect(result.trails[0].id).toBe('trail-1');
    expect(result.source).toBe('database');
  });

  it('should extract from new format with source and meta', () => {
    const response = {
      trails: [
        { id: 'trail-1', name: 'Trail 1' },
        { id: 'trail-2', name: 'Trail 2' },
      ],
      source: 'gemini_generated',
      meta: { place_name: 'Yosemite', count: 2 },
    };

    const result = extractTrailsFromResponse(response);

    expect(result.trails).toHaveLength(2);
    expect(result.source).toBe('gemini_generated');
    expect(result.meta?.place_name).toBe('Yosemite');
  });

  it('should extract from data.trails with source', () => {
    const response = {
      data: {
        trails: [
          { id: 'trail-1', name: 'Trail 1' },
          { id: 'trail-2', name: 'Trail 2' },
        ],
        source: 'google_places_fallback',
        meta: { count: 2, provider_used: 'google_places' },
      },
    };

    const result = extractTrailsFromResponse(response);

    expect(result.trails).toHaveLength(2);
    expect(result.trails[0].id).toBe('trail-1');
    expect(result.source).toBe('google_places_fallback');
    expect(result.meta?.provider_used).toBe('google_places');
  });

  it('should extract from trails property (legacy format)', () => {
    const response = {
      trails: [
        { id: 'trail-1', name: 'Trail 1' },
      ],
    };

    const result = extractTrailsFromResponse(response);

    expect(result.trails).toHaveLength(1);
    expect(result.trails[0].id).toBe('trail-1');
    expect(result.source).toBe('database'); // default for legacy
  });

  it('should handle single trail in data', () => {
    const response = {
      data: {
        id: 'trail-1',
        name: 'Single Trail',
      },
    };

    const result = extractTrailsFromResponse(response);

    expect(result.trails).toHaveLength(1);
    expect(result.trails[0].id).toBe('trail-1');
  });

  it('should handle single trail object', () => {
    const response = {
      id: 'trail-1',
      name: 'Single Trail',
    };

    const result = extractTrailsFromResponse(response);

    expect(result.trails).toHaveLength(1);
    expect(result.trails[0].id).toBe('trail-1');
  });

  it('should return empty array for null/undefined', () => {
    expect(extractTrailsFromResponse(null).trails).toEqual([]);
    expect(extractTrailsFromResponse(undefined).trails).toEqual([]);
    expect(extractTrailsFromResponse(null).source).toBe('none');
  });

  it('should return empty array for unrecognized structure', () => {
    expect(extractTrailsFromResponse({ foo: 'bar' }).trails).toEqual([]);
    expect(extractTrailsFromResponse('string').trails).toEqual([]);
    expect(extractTrailsFromResponse(123).trails).toEqual([]);
    expect(extractTrailsFromResponse({ foo: 'bar' }).source).toBe('none');
  });
});

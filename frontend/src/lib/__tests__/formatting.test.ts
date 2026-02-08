/**
 * Tests for formatting utilities
 */

import {
  formatMiles,
  formatFeet,
  formatHours,
  formatDuration,
  formatTime,
  safeGet,
  isEmpty,
  getTrailDisplayName,
} from '../formatting';

describe('formatMiles', () => {
  it('should format valid numbers', () => {
    expect(formatMiles(5.678)).toBe('5.7');
    expect(formatMiles(10.0)).toBe('10.0');
    expect(formatMiles(0.5)).toBe('0.5');
  });

  it('should handle null and undefined', () => {
    expect(formatMiles(null)).toBe('–');
    expect(formatMiles(undefined)).toBe('–');
  });

  it('should handle string numbers', () => {
    expect(formatMiles('5.678')).toBe('5.7');
    expect(formatMiles('10')).toBe('10.0');
  });

  it('should handle invalid values', () => {
    expect(formatMiles(NaN)).toBe('–');
    expect(formatMiles(-5)).toBe('–');
    expect(formatMiles('')).toBe('–');
  });

  it('should respect decimal places', () => {
    expect(formatMiles(5.6789, 2)).toBe('5.68');
    expect(formatMiles(5.6789, 0)).toBe('6');
  });
});

describe('formatFeet', () => {
  it('should format valid numbers with commas', () => {
    expect(formatFeet(1234)).toBe('1,234');
    expect(formatFeet(5678.9)).toBe('5,679');
    expect(formatFeet(100)).toBe('100');
  });

  it('should handle null and undefined', () => {
    expect(formatFeet(null)).toBe('–');
    expect(formatFeet(undefined)).toBe('–');
  });

  it('should handle string numbers', () => {
    expect(formatFeet('1234')).toBe('1,234');
  });

  it('should handle invalid values', () => {
    expect(formatFeet(NaN)).toBe('–');
    expect(formatFeet(-100)).toBe('–');
  });
});

describe('formatHours', () => {
  it('should format valid numbers', () => {
    expect(formatHours(2.5)).toBe('2.5');
    expect(formatHours(1.0)).toBe('1.0');
  });

  it('should handle null and undefined', () => {
    expect(formatHours(null)).toBe('–');
    expect(formatHours(undefined)).toBe('–');
  });
});

describe('formatDuration', () => {
  it('should format hours for values >= 1', () => {
    expect(formatDuration(2.5)).toBe('2.5 hr');
    expect(formatDuration(1.0)).toBe('1.0 hr');
  });

  it('should format minutes for values < 1', () => {
    expect(formatDuration(0.5)).toBe('30 min');
    expect(formatDuration(0.25)).toBe('15 min');
    expect(formatDuration(0.75)).toBe('45 min');
  });

  it('should handle null and undefined', () => {
    expect(formatDuration(null)).toBe('–');
    expect(formatDuration(undefined)).toBe('–');
  });
});

describe('formatTime', () => {
  it('should format minutes for values < 60', () => {
    expect(formatTime(30)).toBe('30 min');
    expect(formatTime(45)).toBe('45 min');
    expect(formatTime(59)).toBe('59 min');
  });

  it('should format hours for values >= 60', () => {
    expect(formatTime(60)).toBe('1 hr');
    expect(formatTime(120)).toBe('2 hr');
  });

  it('should format hours and minutes for mixed values', () => {
    expect(formatTime(90)).toBe('1h 30m');
    expect(formatTime(150)).toBe('2h 30m');
    expect(formatTime(75)).toBe('1h 15m');
  });

  it('should handle null and undefined', () => {
    expect(formatTime(null)).toBe('–');
    expect(formatTime(undefined)).toBe('–');
  });

  it('should handle invalid values', () => {
    expect(formatTime(NaN)).toBe('–');
    expect(formatTime(-30)).toBe('–');
    expect(formatTime('')).toBe('–');
  });

  it('should handle string numbers', () => {
    expect(formatTime('90')).toBe('1h 30m');
    expect(formatTime('30')).toBe('30 min');
  });
});

describe('safeGet', () => {
  const obj = {
    user: {
      name: 'John',
      address: {
        city: 'NYC',
      },
    },
  };

  it('should get nested values', () => {
    expect(safeGet(obj, 'user.name')).toBe('John');
    expect(safeGet(obj, 'user.address.city')).toBe('NYC');
  });

  it('should return fallback for missing paths', () => {
    expect(safeGet(obj, 'user.email')).toBe('–');
    expect(safeGet(obj, 'user.address.zip', 'N/A')).toBe('N/A');
  });

  it('should handle null/undefined objects', () => {
    expect(safeGet(null, 'user.name')).toBe('–');
    expect(safeGet(undefined, 'user.name')).toBe('–');
  });
});

describe('isEmpty', () => {
  it('should detect empty values', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty('')).toBe(true);
    expect(isEmpty(0)).toBe(true);
  });

  it('should detect non-empty values', () => {
    expect(isEmpty('hello')).toBe(false);
    expect(isEmpty(42)).toBe(false);
    expect(isEmpty([])).toBe(false);
    expect(isEmpty({})).toBe(false);
  });
});

describe('getTrailDisplayName', () => {
  it('should use trail.name if available', () => {
    expect(getTrailDisplayName({ name: 'Eagle Peak Trail' })).toBe('Eagle Peak Trail');
  });

  it('should use trail.title as fallback', () => {
    expect(getTrailDisplayName({ title: 'Mountain View' })).toBe('Mountain View');
  });

  it('should use trail.trail_name as fallback', () => {
    expect(getTrailDisplayName({ trail_name: 'River Loop' })).toBe('River Loop');
  });

  it('should generate name from park name and index', () => {
    expect(getTrailDisplayName({}, 0, 'Yosemite')).toBe('Yosemite Trail 1');
    expect(getTrailDisplayName({}, 2, 'Yellowstone')).toBe('Yellowstone Trail 3');
  });

  it('should use generic Trail N if only index provided', () => {
    expect(getTrailDisplayName({}, 5)).toBe('Trail 6');
  });

  it('should return "Unnamed Trail" as final fallback', () => {
    expect(getTrailDisplayName({})).toBe('Unnamed Trail');
  });

  it('should trim whitespace from names', () => {
    expect(getTrailDisplayName({ name: '  Spaced Trail  ' })).toBe('Spaced Trail');
  });

  it('should ignore empty strings', () => {
    expect(getTrailDisplayName({ name: '   ' }, 0, 'Park')).toBe('Park Trail 1');
  });
});

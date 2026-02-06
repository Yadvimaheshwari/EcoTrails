import { describe, it, expect } from '@jest/globals';
import { TripPlan, Discovery, ChecklistItem } from '../types';
import { filterDiscoveriesByCategory } from '../mockData';

/**
 * Test: Selecting latest active hike
 */
describe('selectLatestActiveHike', () => {
  const selectLatestActiveHike = (hikes: Array<{ id: string; startTime: string; status: string }>) => {
    const activeHikes = hikes.filter(h => h.status === 'active');
    if (activeHikes.length === 0) return null;
    if (activeHikes.length === 1) return activeHikes[0];
    
    // Return the one with the most recent startTime
    return activeHikes.reduce((latest, current) => {
      return new Date(current.startTime) > new Date(latest.startTime) ? current : latest;
    });
  };

  it('should return null when no active hikes exist', () => {
    const hikes = [
      { id: 'h1', startTime: '2026-01-01T10:00:00Z', status: 'completed' },
      { id: 'h2', startTime: '2026-01-02T10:00:00Z', status: 'completed' },
    ];
    expect(selectLatestActiveHike(hikes)).toBeNull();
  });

  it('should return the single active hike', () => {
    const hikes = [
      { id: 'h1', startTime: '2026-01-01T10:00:00Z', status: 'completed' },
      { id: 'h2', startTime: '2026-01-02T10:00:00Z', status: 'active' },
    ];
    const result = selectLatestActiveHike(hikes);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('h2');
  });

  it('should return the most recent active hike when multiple exist', () => {
    const hikes = [
      { id: 'h1', startTime: '2026-01-01T10:00:00Z', status: 'active' },
      { id: 'h2', startTime: '2026-01-03T10:00:00Z', status: 'active' },
      { id: 'h3', startTime: '2026-01-02T10:00:00Z', status: 'active' },
    ];
    const result = selectLatestActiveHike(hikes);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('h2'); // Most recent
  });

  it('should handle same timestamp by returning first match', () => {
    const hikes = [
      { id: 'h1', startTime: '2026-01-01T10:00:00Z', status: 'active' },
      { id: 'h2', startTime: '2026-01-01T10:00:00Z', status: 'active' },
    ];
    const result = selectLatestActiveHike(hikes);
    expect(result).not.toBeNull();
    expect(['h1', 'h2']).toContain(result?.id);
  });
});

/**
 * Test: Checklist progress calculation
 */
describe('calculateChecklistProgress', () => {
  const calculateChecklistProgress = (checklist: ChecklistItem[]) => {
    if (checklist.length === 0) {
      return {
        completed: 0,
        total: 0,
        percent: 0,
        requiredCompleted: 0,
        requiredTotal: 0,
      };
    }

    const completed = checklist.filter(item => item.completed).length;
    const total = checklist.length;
    const percent = Math.round((completed / total) * 100);

    const requiredItems = checklist.filter(item => item.required);
    const requiredCompleted = requiredItems.filter(item => item.completed).length;
    const requiredTotal = requiredItems.length;

    return {
      completed,
      total,
      percent,
      requiredCompleted,
      requiredTotal,
    };
  };

  it('should return zero progress for empty checklist', () => {
    const result = calculateChecklistProgress([]);
    expect(result).toEqual({
      completed: 0,
      total: 0,
      percent: 0,
      requiredCompleted: 0,
      requiredTotal: 0,
    });
  });

  it('should calculate progress correctly with all items incomplete', () => {
    const checklist: ChecklistItem[] = [
      { id: '1', category: 'gear', item: 'Boots', completed: false, required: true },
      { id: '2', category: 'gear', item: 'Jacket', completed: false, required: false },
    ];
    const result = calculateChecklistProgress(checklist);
    expect(result.completed).toBe(0);
    expect(result.total).toBe(2);
    expect(result.percent).toBe(0);
    expect(result.requiredCompleted).toBe(0);
    expect(result.requiredTotal).toBe(1);
  });

  it('should calculate progress correctly with some items complete', () => {
    const checklist: ChecklistItem[] = [
      { id: '1', category: 'gear', item: 'Boots', completed: true, required: true },
      { id: '2', category: 'gear', item: 'Jacket', completed: false, required: true },
      { id: '3', category: 'gear', item: 'Hat', completed: true, required: false },
    ];
    const result = calculateChecklistProgress(checklist);
    expect(result.completed).toBe(2);
    expect(result.total).toBe(3);
    expect(result.percent).toBe(67); // 2/3 = 66.666... rounded to 67
    expect(result.requiredCompleted).toBe(1);
    expect(result.requiredTotal).toBe(2);
  });

  it('should calculate 100% when all items complete', () => {
    const checklist: ChecklistItem[] = [
      { id: '1', category: 'gear', item: 'Boots', completed: true, required: true },
      { id: '2', category: 'gear', item: 'Jacket', completed: true, required: false },
    ];
    const result = calculateChecklistProgress(checklist);
    expect(result.completed).toBe(2);
    expect(result.total).toBe(2);
    expect(result.percent).toBe(100);
    expect(result.requiredCompleted).toBe(1);
    expect(result.requiredTotal).toBe(1);
  });

  it('should handle checklist with no required items', () => {
    const checklist: ChecklistItem[] = [
      { id: '1', category: 'gear', item: 'Boots', completed: true, required: false },
      { id: '2', category: 'gear', item: 'Jacket', completed: false, required: false },
    ];
    const result = calculateChecklistProgress(checklist);
    expect(result.completed).toBe(1);
    expect(result.total).toBe(2);
    expect(result.percent).toBe(50);
    expect(result.requiredCompleted).toBe(0);
    expect(result.requiredTotal).toBe(0);
  });
});

/**
 * Test: Filtering discoveries by category
 */
describe('filterDiscoveriesByCategory', () => {
  const mockDiscoveries: Discovery[] = [
    {
      id: 'd1',
      category: 'wildlife',
      name: 'Deer',
      description: 'A deer',
      confidence: 0.95,
      location: { latitude: 0, longitude: 0 },
      parkName: 'Test Park',
      hikeId: 'h1',
      timestamp: '2026-01-01T10:00:00Z',
    },
    {
      id: 'd2',
      category: 'vegetation',
      name: 'Oak Tree',
      description: 'An oak tree',
      confidence: 0.90,
      location: { latitude: 0, longitude: 0 },
      parkName: 'Test Park',
      hikeId: 'h1',
      timestamp: '2026-01-01T10:30:00Z',
    },
    {
      id: 'd3',
      category: 'wildlife',
      name: 'Eagle',
      description: 'An eagle',
      confidence: 0.85,
      location: { latitude: 0, longitude: 0 },
      parkName: 'Test Park',
      hikeId: 'h1',
      timestamp: '2026-01-01T11:00:00Z',
    },
    {
      id: 'd4',
      category: 'geology',
      name: 'Granite',
      description: 'A granite rock',
      confidence: 0.92,
      location: { latitude: 0, longitude: 0 },
      parkName: 'Test Park',
      hikeId: 'h2',
      timestamp: '2026-01-02T10:00:00Z',
    },
  ];

  it('should return all discoveries when category is "all"', () => {
    const result = filterDiscoveriesByCategory(mockDiscoveries, 'all');
    expect(result.length).toBe(4);
  });

  it('should filter by wildlife category', () => {
    const result = filterDiscoveriesByCategory(mockDiscoveries, 'wildlife');
    expect(result.length).toBe(2);
    expect(result.every(d => d.category === 'wildlife')).toBe(true);
    expect(result.map(d => d.id)).toEqual(['d1', 'd3']);
  });

  it('should filter by vegetation category', () => {
    const result = filterDiscoveriesByCategory(mockDiscoveries, 'vegetation');
    expect(result.length).toBe(1);
    expect(result[0].category).toBe('vegetation');
    expect(result[0].id).toBe('d2');
  });

  it('should filter by geology category', () => {
    const result = filterDiscoveriesByCategory(mockDiscoveries, 'geology');
    expect(result.length).toBe(1);
    expect(result[0].category).toBe('geology');
    expect(result[0].id).toBe('d4');
  });

  it('should return empty array for category with no matches', () => {
    const result = filterDiscoveriesByCategory(mockDiscoveries, 'history');
    expect(result.length).toBe(0);
  });

  it('should return all discoveries when category is undefined', () => {
    const result = filterDiscoveriesByCategory(mockDiscoveries);
    expect(result.length).toBe(4);
  });

  it('should handle empty discoveries array', () => {
    const result = filterDiscoveriesByCategory([], 'wildlife');
    expect(result.length).toBe(0);
  });
});

/**
 * Mock Data for Journal System
 * Realistic examples for development and testing
 */

import {
  TripPlan,
  Hike,
  Discovery,
  Achievement,
  UserStats,
  ActiveHikeContext,
  WildlifeHighlight,
  ActivitySuggestion,
} from './types';

// Mock Active Hike
export const mockActiveHike: ActiveHikeContext | null = null; // Set to null or provide active hike
/*
export const mockActiveHike: ActiveHikeContext = {
  hikeId: 'active-1',
  trailName: 'Half Dome Trail',
  startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
  elapsedTime: 10800, // 3 hours in seconds
  gpsStatus: 'good',
  isOffline: false,
  currentLocation: { lat: 37.7459, lng: -119.5332 },
};
*/

// Mock Trip Plans
export const mockTripPlans: TripPlan[] = [
  {
    id: 'plan-1',
    name: 'Yosemite Spring Adventure',
    parkName: 'Yosemite National Park',
    parkId: 'yose',
    startDate: '2026-05-15',
    endDate: '2026-05-18',
    plannedTrails: [
      {
        id: 'trail-1',
        name: 'Mist Trail to Vernal Fall',
        distance: 5.4,
        elevationGain: 1000,
        difficulty: 'moderate',
        estimatedTime: 4,
        startLocation: 'Happy Isles Trailhead',
        highlights: ['Waterfall views', 'Misty spray', 'Granite steps'],
      },
      {
        id: 'trail-2',
        name: 'Mirror Lake Loop',
        distance: 5.0,
        elevationGain: 100,
        difficulty: 'easy',
        estimatedTime: 2.5,
        startLocation: 'Mirror Lake Trailhead',
        highlights: ['Reflections', 'Half Dome views', 'Meadows'],
      },
    ],
    checklist: [
      { id: 'c1', category: 'permits', item: 'Wilderness permit', completed: false, required: true },
      { id: 'c2', category: 'gear', item: 'Rain jacket', completed: true, required: true },
      { id: 'c3', category: 'gear', item: 'Trekking poles', completed: true, required: false },
      { id: 'c4', category: 'food', item: 'Trail snacks', completed: false, required: true },
      { id: 'c5', category: 'safety', item: 'First aid kit', completed: true, required: true },
      { id: 'c6', category: 'gear', item: 'Water filter', completed: false, required: true },
    ],
    logistics: {
      transportation: 'driving',
      parkingDetails: 'Day use parking at Yosemite Valley',
      accommodations: 'Curry Village tent cabin',
      emergencyContact: '911 or Yosemite Dispatch: (209) 379-1992',
      rangersStation: 'Yosemite Valley Visitor Center',
    },
    permits: {
      status: 'in_progress',
      required: true,
      permitType: 'Wilderness Permit',
      applicationDate: '2026-04-10',
      notes: 'Applied via recreation.gov, awaiting confirmation',
    },
    offlineStatus: 'not_downloaded',
    weather: {
      highTemp: 68,
      lowTemp: 42,
      conditions: 'Partly cloudy',
      precipitation: 20,
      sunrise: '06:15',
      sunset: '20:05',
    },
    wildlife: [
      {
        species: 'Black Bear',
        likelihood: 'medium',
        season: 'Spring-Fall',
        bestTime: 'Dawn and dusk',
        tips: 'Store food in bear boxes. Make noise while hiking to avoid surprises.',
      },
      {
        species: 'Mule Deer',
        likelihood: 'high',
        season: 'Year-round',
        bestTime: 'Morning and evening',
        tips: 'Common in meadows and near water sources.',
      },
      {
        species: 'Steller\'s Jay',
        likelihood: 'high',
        season: 'Year-round',
        bestTime: 'All day',
        tips: 'Bold blue birds often found near picnic areas. Don\'t feed them.',
      },
      {
        species: 'Western Gray Squirrel',
        likelihood: 'high',
        season: 'Year-round',
        bestTime: 'Morning',
        tips: 'Often seen in oak groves collecting acorns.',
      },
      {
        species: 'Peregrine Falcon',
        likelihood: 'low',
        season: 'Spring-Summer',
        bestTime: 'Mid-morning',
        tips: 'Nests on cliff faces. Look for them soaring near El Capitan.',
      },
    ],
    activities: [
      {
        name: 'Sunrise at Tunnel View',
        description: 'Iconic valley view with Half Dome, El Capitan, and Bridalveil Fall at golden hour.',
        location: 'Wawona Road (Highway 41)',
        timing: 'Sunrise (6:15 AM)',
        difficulty: 'easy',
      },
      {
        name: 'Ranger-Led Geology Walk',
        description: 'Learn about Yosemite\'s formation from glaciers and granite.',
        location: 'Yosemite Valley Visitor Center',
        timing: 'Daily at 10 AM',
      },
      {
        name: 'Mirror Lake Loop',
        description: 'Easy walk with stunning reflections of Half Dome in calm water.',
        location: 'Mirror Lake Trailhead',
        timing: 'Best at sunrise for reflections',
        difficulty: 'easy',
      },
      {
        name: 'Stargazing in Yosemite Valley',
        description: 'Dark skies perfect for viewing the Milky Way and constellations.',
        location: 'Cook\'s Meadow or Stoneman Meadow',
        timing: 'After 9 PM (moonless nights best)',
      },
      {
        name: 'Photography at Bridalveil Fall',
        description: 'Capture the mist and rainbows from this 617-foot waterfall.',
        location: 'Bridalveil Fall parking area',
        timing: 'Late afternoon for best light',
        difficulty: 'easy',
      },
    ],
    notes: 'Peak waterfall season. Expect crowds on weekends.',
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-25T14:30:00Z',
  },
  {
    id: 'plan-2',
    name: 'Grand Canyon Rim-to-Rim',
    parkName: 'Grand Canyon National Park',
    parkId: 'grca',
    startDate: '2026-06-20',
    endDate: '2026-06-21',
    plannedTrails: [
      {
        id: 'trail-3',
        name: 'North Kaibab to Bright Angel',
        distance: 23.5,
        elevationGain: 5850,
        difficulty: 'expert',
        estimatedTime: 14,
        startLocation: 'North Kaibab Trailhead',
        highlights: ['Colorado River', 'Phantom Ranch', 'Rim views'],
      },
    ],
    checklist: [
      { id: 'c7', category: 'permits', item: 'Backcountry permit', completed: true, required: true },
      { id: 'c8', category: 'gear', item: 'Headlamp', completed: true, required: true },
      { id: 'c9', category: 'food', item: 'Electrolyte tablets', completed: false, required: true },
    ],
    logistics: {
      transportation: 'shuttle',
      shuttleInfo: 'Trans-Canyon Shuttle from South to North Rim',
      accommodations: 'Phantom Ranch (reserved)',
      emergencyContact: '911 or Grand Canyon Dispatch: (928) 638-7805',
    },
    permits: {
      status: 'obtained',
      required: true,
      permitType: 'Backcountry Overnight',
      confirmationNumber: 'GC-2026-1234',
    },
    offlineStatus: 'ready',
    wildlife: [
      {
        species: 'California Condor',
        likelihood: 'medium',
        season: 'Year-round',
        bestTime: 'Morning thermals (9-11 AM)',
        tips: 'Look for them soaring near the rim. They have numbered wing tags.',
      },
      {
        species: 'Bighorn Sheep',
        likelihood: 'low',
        season: 'Year-round',
        bestTime: 'Early morning',
        tips: 'Often spotted on rocky ledges below the rim.',
      },
      {
        species: 'Ringtail',
        likelihood: 'low',
        season: 'Year-round',
        bestTime: 'Night',
        tips: 'Nocturnal relative of raccoons. Listen for them near campsites at night.',
      },
      {
        species: 'Western Rattlesnake',
        likelihood: 'medium',
        season: 'Spring-Fall',
        bestTime: 'Warm afternoons',
        tips: 'Watch where you step. Give them space if encountered.',
      },
    ],
    activities: [
      {
        name: 'Phantom Ranch Canteen',
        description: 'Historic rest stop at the bottom of the canyon. Enjoy lemonade and snacks.',
        location: 'Phantom Ranch',
        timing: 'During inner canyon rest stop',
      },
      {
        name: 'Colorado River Beach',
        description: 'Take a refreshing break at the river beach near Bright Angel Campground.',
        location: 'Bottom of Bright Angel Trail',
        timing: 'Midday for cooling off',
        difficulty: 'easy',
      },
      {
        name: 'Ribbon Falls Side Trip',
        description: 'Beautiful 100-foot waterfall detour from North Kaibab Trail.',
        location: 'North Kaibab Trail (5.5 miles from rim)',
        timing: 'Allow 1 hour extra',
        difficulty: 'moderate',
      },
    ],
    createdAt: '2026-03-15T09:00:00Z',
    updatedAt: '2026-04-20T11:15:00Z',
  },
];

// Mock Completed Hikes
export const mockCompletedHikes: Hike[] = [
  {
    id: 'hike-1',
    trailName: 'Angels Landing',
    parkName: 'Zion National Park',
    parkId: 'zion',
    status: 'completed',
    startTime: '2026-04-15T07:30:00Z',
    endTime: '2026-04-15T12:15:00Z',
    stats: {
      distance: 5.4,
      duration: 285, // minutes
      elevationGain: 1488,
      elevationLoss: 1488,
      maxAltitude: 5790,
      avgPace: 52.8,
      movingTime: 240,
      calories: 1850,
    },
    discoveries: ['disc-1', 'disc-2'] as any,
    media: [
      {
        id: 'media-1',
        type: 'photo',
        url: '/mock/angels-landing-1.jpg',
        thumbnail: '/mock/angels-landing-1-thumb.jpg',
        timestamp: '2026-04-15T10:00:00Z',
        location: { lat: 37.2690, lng: -112.9480 },
        caption: 'Summit view',
      },
    ],
    reflection: 'Absolutely incredible hike! The chains section was intense but manageable. Views from the top were breathtaking. Started early to avoid crowds - highly recommend.',
    highlights: [
      'Successfully navigated the chains section',
      'Perfect weather conditions',
      'Spotted a California condor',
      'Made it to summit before noon',
    ],
    achievements: ['first_expert_trail'],
  },
  {
    id: 'hike-2',
    trailName: 'Emerald Lake Trail',
    parkName: 'Rocky Mountain National Park',
    parkId: 'romo',
    status: 'completed',
    startTime: '2026-03-20T08:00:00Z',
    endTime: '2026-03-20T11:30:00Z',
    stats: {
      distance: 3.6,
      duration: 210,
      elevationGain: 650,
      elevationLoss: 650,
      maxAltitude: 10080,
      avgPace: 58.3,
    },
    discoveries: ['disc-3'] as any,
    media: [],
    reflection: 'Beautiful alpine lake surrounded by peaks. Trail was mostly snow-covered - brought microspikes. Peaceful and serene.',
    highlights: [
      'First high-altitude hike of the season',
      'Pristine snow conditions',
      'Emerald Lake frozen over',
    ],
  },
];

// Mock Discoveries
export const mockDiscoveries: Discovery[] = [
  {
    id: 'disc-1',
    category: 'wildlife',
    name: 'California Condor',
    commonName: 'California Condor',
    scientificName: 'Gymnogyps californianus',
    description: 'Large black vulture with white wing patches',
    confidence: 92,
    location: { lat: 37.2690, lng: -112.9480 },
    elevation: 5500,
    parkName: 'Zion National Park',
    hikeId: 'hike-1',
    timestamp: '2026-04-15T10:30:00Z',
    photo: '/mock/condor.jpg',
    aiInsights: {
      habitat: 'Rocky cliffs and open country',
      behavior: 'Soaring flight, scavenging',
      conservation: 'Critically endangered - recovery program success story',
      funFacts: [
        'Largest land bird in North America',
        'Wingspan up to 9.8 feet',
        'Can live 60+ years',
      ],
    },
  },
  {
    id: 'disc-2',
    category: 'vegetation',
    name: 'Fremont Cottonwood',
    commonName: 'Fremont Cottonwood',
    scientificName: 'Populus fremontii',
    description: 'Large deciduous tree with heart-shaped leaves',
    confidence: 88,
    location: { lat: 37.2650, lng: -112.9470 },
    parkName: 'Zion National Park',
    hikeId: 'hike-1',
    timestamp: '2026-04-15T08:45:00Z',
    aiInsights: {
      habitat: 'Riparian areas, along streams',
      season: 'Bright yellow in fall',
      funFacts: ['Named after explorer John C. Frémont', 'Important for wildlife habitat'],
    },
  },
  {
    id: 'disc-3',
    category: 'geology',
    name: 'Glacial Erratic',
    description: 'Large boulder deposited by glacial ice',
    confidence: 85,
    location: { lat: 40.3147, lng: -105.6440 },
    elevation: 9950,
    parkName: 'Rocky Mountain National Park',
    hikeId: 'hike-2',
    timestamp: '2026-03-20T09:15:00Z',
    aiInsights: {
      habitat: 'Alpine and subalpine zones',
      funFacts: [
        'Left behind when glaciers melted',
        'Rock type often different from surrounding bedrock',
      ],
    },
  },
];

// Mock Achievements
export const mockAchievements: Achievement[] = [
  {
    id: 'ach-1',
    code: 'first_hike',
    name: 'First Steps',
    description: 'Completed your first hike',
    category: 'milestones',
    icon: '🥾',
    status: 'unlocked',
    unlockedAt: '2026-03-20T11:30:00Z',
    unlockedHikeId: 'hike-2',
  },
  {
    id: 'ach-2',
    code: 'first_expert_trail',
    name: 'Expert Explorer',
    description: 'Conquered your first expert-level trail',
    category: 'difficulty',
    icon: '⛰️',
    status: 'unlocked',
    unlockedAt: '2026-04-15T12:15:00Z',
    unlockedHikeId: 'hike-1',
  },
  {
    id: 'ach-3',
    code: 'elevation_10k',
    name: 'Mile High Club',
    description: 'Gained 10,000 feet of total elevation',
    category: 'elevation',
    icon: '📈',
    status: 'locked',
    progress: {
      current: 8138,
      target: 10000,
      unit: 'feet',
    },
  },
  {
    id: 'ach-4',
    code: '10_trails',
    name: 'Trail Blazer',
    description: 'Completed 10 different trails',
    category: 'milestones',
    icon: '🏆',
    status: 'locked',
    progress: {
      current: 2,
      target: 10,
      unit: 'trails',
    },
  },
  {
    id: 'ach-5',
    code: 'park_yosemite',
    name: 'Yosemite Explorer',
    description: 'Completed a trail in Yosemite National Park',
    category: 'park_explorer',
    icon: '🏞️',
    status: 'locked',
  },
];

// Mock User Stats
export const mockUserStats: UserStats = {
  parksExplored: 2,
  trailsCompleted: 2,
  totalElevationGained: 2138,
  totalDistance: 9.0,
  discoveriesLogged: 3,
  achievementsUnlocked: 2,
  explorerLevel: 1,
  nextMilestone: {
    name: '5 Trails Completed',
    progress: 40, // 2/5
    description: 'Complete 3 more trails to reach Explorer Level 2',
  },
};

// Mock Wildlife & Activities
export const mockWildlifeHighlights: WildlifeHighlight[] = [
  {
    species: 'Black Bear',
    likelihood: 'medium',
    season: 'Spring-Fall',
    bestTime: 'Dawn and dusk',
    tips: 'Store food properly, make noise while hiking',
  },
  {
    species: 'Mule Deer',
    likelihood: 'high',
    season: 'Year-round',
    bestTime: 'Morning and evening',
    tips: 'Common in meadows and valleys',
  },
];

export const mockActivitySuggestions: ActivitySuggestion[] = [
  {
    name: 'Tunnel View Sunrise',
    description: 'Iconic valley view at golden hour',
    location: 'Wawona Road',
    timing: 'Sunrise (6:15 AM)',
    difficulty: 'easy',
  },
  {
    name: 'Ranger-Led Geology Walk',
    description: 'Learn about Yosemite\'s formation',
    location: 'Yosemite Valley',
    timing: 'Daily at 10 AM',
  },
];

export const mockNextMilestone = {
  name: '5 Trails Completed',
  current: 2,
  description: 'Complete 3 more trails to reach Explorer Level 2',
  progress: {
    current: 2,
    target: 5,
    unit: 'trails',
  },
};

// Export mockCompletedHikes as mockHikes for convenience
export const mockHikes = mockCompletedHikes;

// Utility functions
export function getLatestActiveHike(): ActiveHikeContext | null {
  // In real implementation, fetch from API and return only the most recent
  return mockActiveHike;
}

export function calculateChecklistProgress(checklist: any[]): { completed: number; total: number } {
  const completed = checklist.filter((item) => item.completed).length;
  return { completed, total: checklist.length };
}

export function filterDiscoveriesByCategory(
  discoveries: Discovery[],
  category?: string
): Discovery[] {
  if (!category || category === 'all') return discoveries;
  return discoveries.filter((d) => d.category === category);
}

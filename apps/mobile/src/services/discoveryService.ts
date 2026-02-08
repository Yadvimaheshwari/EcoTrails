/**
 * Discovery Service (Mobile)
 * Manages discoveries for trails - fetches from API or generates mock data
 * Handles capture and badge awarding
 */

import { api } from '../config/api';
import {
  Discovery,
  DiscoveryType,
  CapturedDiscovery,
} from '../types/discovery';
import { Badge, BadgeType, BadgeAward, BADGE_DEFINITIONS } from '../types/badge';

// Feature flag for mock data (set to true for dev without backend)
const USE_MOCK_DISCOVERIES = false;

/**
 * Fetch discoveries for a trail
 */
export async function getTrailDiscoveries(trailId: string): Promise<Discovery[]> {
  if (USE_MOCK_DISCOVERIES) {
    return generateMockDiscoveries(trailId);
  }

  try {
    const response = await api.get(`/api/v1/trails/${trailId}/discoveries`);
    return response.data?.discoveries || [];
  } catch (error) {
    console.warn('[DiscoveryService] Failed to fetch discoveries, using mock data:', error);
    return generateMockDiscoveries(trailId);
  }
}

/**
 * Capture a discovery
 */
export async function captureDiscovery(
  hikeId: string,
  discoveryId: string,
  location: { lat: number; lng: number },
  photoUri?: string,
  notes?: string
): Promise<{ success: boolean; badge: Badge | null; capturedDiscovery: CapturedDiscovery | null }> {
  if (USE_MOCK_DISCOVERIES) {
    return mockCaptureDiscovery(hikeId, discoveryId, location, photoUri, notes);
  }

  try {
    const formData = new FormData();
    formData.append('discovery_id', discoveryId);
    formData.append('location', JSON.stringify(location));
    if (notes) formData.append('notes', notes);
    // Photo upload would need to be handled separately for React Native

    const response = await api.post(`/api/v1/hikes/${hikeId}/discoveries`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return {
      success: true,
      badge: response.data?.awarded_badge || null,
      capturedDiscovery: response.data?.captured_discovery || null,
    };
  } catch (error) {
    console.error('[DiscoveryService] Failed to capture discovery:', error);
    return mockCaptureDiscovery(hikeId, discoveryId, location, photoUri, notes);
  }
}

export interface HikeSummaryData {
  hikeId: string;
  distance: number;
  durationMinutes: number;
  discoveriesCount: number;
  badgesCount: number;
  capturedDiscoveries: CapturedDiscovery[];
  earnedBadges: Badge[];
}

// ============================================
// MOCK DATA GENERATION
// ============================================

/**
 * Generate mock discoveries for a trail
 */
function generateMockDiscoveries(trailId: string): Discovery[] {
  const seed = hashString(trailId);
  const random = seededRandom(seed);

  const count = Math.floor(random() * 5) + 3; // 3-7 discoveries
  const discoveries: Discovery[] = [];

  const discoveryTypes: { type: DiscoveryType; weight: number }[] = [
    { type: 'plant', weight: 3 },
    { type: 'wildlife', weight: 2 },
    { type: 'scenic_view', weight: 3 },
    { type: 'geological', weight: 2 },
    { type: 'water_feature', weight: 2 },
    { type: 'historical', weight: 1 },
    { type: 'trail_marker', weight: 2 },
    { type: 'hidden_gem', weight: 1 },
  ];

  for (let i = 0; i < count; i++) {
    const type = weightedRandomPick(discoveryTypes, random);
    const template = DISCOVERY_TEMPLATES[type];
    const templateItem = template[Math.floor(random() * template.length)];

    discoveries.push({
      id: `${trailId}-discovery-${i}`,
      trailId,
      lat: 37.7749 + (random() - 0.5) * 0.02,
      lng: -122.4194 + (random() - 0.5) * 0.02,
      type,
      title: templateItem.title,
      shortText: templateItem.shortText,
      longText: templateItem.longText,
      badgeType: getBadgeTypeForDiscovery(type),
      difficulty: weightedRandomPick(
        [
          { type: 'common' as const, weight: 5 },
          { type: 'uncommon' as const, weight: 3 },
          { type: 'rare' as const, weight: 2 },
          { type: 'legendary' as const, weight: 0.5 },
        ],
        random
      ),
      revealRadiusMeters: 150,
    });
  }

  return discoveries;
}

/**
 * Mock capture discovery response
 */
function mockCaptureDiscovery(
  hikeId: string,
  discoveryId: string,
  location: { lat: number; lng: number },
  photoUri?: string,
  notes?: string
): { success: boolean; badge: Badge | null; capturedDiscovery: CapturedDiscovery | null } {
  const discoveryType = getDiscoveryTypeFromId(discoveryId);
  const badgeType = getBadgeTypeForDiscovery(discoveryType);
  const badgeDef = BADGE_DEFINITIONS[badgeType];

  const badge: Badge = {
    id: `badge-${Date.now()}`,
    ...badgeDef,
  };

  const capturedDiscovery: CapturedDiscovery = {
    id: `capture-${Date.now()}`,
    discoveryId,
    hikeId,
    userId: 'current-user',
    capturedAt: new Date().toISOString(),
    location,
    photoUri,
    notes,
  };

  return {
    success: true,
    badge,
    capturedDiscovery,
  };
}

/**
 * Get badge type for discovery type
 */
function getBadgeTypeForDiscovery(type: DiscoveryType): BadgeType {
  const mapping: Record<DiscoveryType, BadgeType> = {
    wildlife: 'wildlife_spotter',
    plant: 'plant_identifier',
    geological: 'geology_enthusiast',
    historical: 'history_buff',
    scenic_view: 'scenic_collector',
    water_feature: 'water_finder',
    trail_marker: 'trail_blazer',
    habitat: 'habitat_explorer',
    cultural: 'cultural_curator',
    hidden_gem: 'hidden_gem_finder',
  };
  return mapping[type] || 'first_discovery';
}

function getDiscoveryTypeFromId(discoveryId: string): DiscoveryType {
  return 'scenic_view';
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

function weightedRandomPick<T>(items: { type: T; weight: number }[], random: () => number): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let r = random() * totalWeight;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.type;
  }
  return items[items.length - 1].type;
}

// ============================================
// DISCOVERY TEMPLATES
// ============================================

const DISCOVERY_TEMPLATES: Record<DiscoveryType, Array<{ title: string; shortText: string; longText?: string }>> = {
  wildlife: [
    {
      title: 'Deer Tracks',
      shortText: 'Fresh deer tracks cross the trail here. These prints suggest a small herd passed through recently.',
    },
    {
      title: 'Bird Nest',
      shortText: 'A carefully woven nest sits in the branches above. Can you spot what species built it?',
    },
    {
      title: 'Squirrel Cache',
      shortText: 'A gray squirrel has been busy here! Notice the disturbed soil where acorns were buried.',
    },
  ],
  plant: [
    {
      title: 'Ancient Oak',
      shortText: 'This magnificent oak is estimated to be over 200 years old. Notice its sprawling canopy.',
    },
    {
      title: 'Wildflower Meadow',
      shortText: 'A colorful patch of native wildflowers attracts pollinators in this sunny clearing.',
    },
    {
      title: 'Fern Grotto',
      shortText: 'Delicate ferns thrive in this shaded, moist microclimate. Some species date back to dinosaur times.',
    },
  ],
  scenic_view: [
    {
      title: 'Valley Overlook',
      shortText: 'Take in the sweeping views of the valley below. On clear days, you can see for miles.',
    },
    {
      title: 'Sunset Point',
      shortText: 'This west-facing clearing offers spectacular sunset views. Worth timing your hike for!',
    },
    {
      title: 'Ridge Vista',
      shortText: 'The trail opens up here to reveal panoramic views of the surrounding ridgelines.',
    },
  ],
  geological: [
    {
      title: 'Exposed Rock Formation',
      shortText: 'These layered rocks tell a story millions of years in the making. Notice the different colors.',
    },
    {
      title: 'Glacial Erratic',
      shortText: 'This large boulder was deposited here by glaciers during the last ice age.',
    },
  ],
  water_feature: [
    {
      title: 'Seasonal Creek',
      shortText: 'Listen for the sound of flowing water. This creek is fed by springs higher up the mountain.',
    },
    {
      title: 'Natural Spring',
      shortText: 'Cool, fresh water emerges from the ground here year-round. A vital resource for wildlife.',
    },
  ],
  historical: [
    {
      title: 'Historic Trail Marker',
      shortText: 'This stone marker was placed here in 1920 by the Civilian Conservation Corps.',
    },
    {
      title: 'Old Homestead Site',
      shortText: 'The stone foundation visible here is all that remains of an 1880s settler cabin.',
    },
  ],
  trail_marker: [
    {
      title: 'Trail Junction',
      shortText: 'Multiple trails converge here. Check your map to ensure you take the right path.',
    },
    {
      title: 'Distance Marker',
      shortText: 'You have covered 2 miles. Keep up the great pace!',
    },
  ],
  hidden_gem: [
    {
      title: 'Secret Viewpoint',
      shortText: 'Few hikers know about this spot. Take a moment to enjoy the solitude and the view.',
    },
    {
      title: 'Hidden Waterfall',
      shortText: 'A small but beautiful waterfall tucked away from the main trail. Worth the detour!',
    },
  ],
  habitat: [
    {
      title: 'Wetland Ecosystem',
      shortText: 'This marshy area supports a diverse ecosystem of plants, amphibians, and waterfowl.',
    },
  ],
  cultural: [
    {
      title: 'Indigenous Heritage Site',
      shortText: 'This area holds cultural significance. Please observe and respect this sacred space.',
    },
  ],
};

/**
 * Create a badge award message
 */
export function createBadgeAward(badge: Badge, isFirstOfType: boolean): BadgeAward {
  const messages = [
    `You earned the ${badge.name} badge!`,
    `Amazing! ${badge.name} unlocked!`,
    `🎉 New badge: ${badge.name}!`,
    `Great find! ${badge.name} is yours!`,
  ];

  return {
    badge,
    isNew: isFirstOfType,
    message: messages[Math.floor(Math.random() * messages.length)],
  };
}

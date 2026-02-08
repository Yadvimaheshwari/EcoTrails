/**
 * Badge Types for Gamified Hike Experience
 * Badges are awarded when users capture discoveries
 */

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon URL
  type: BadgeType;
  level: BadgeLevel;
  rarity: BadgeRarity;
  unlockedAt?: string; // ISO timestamp when earned
  progress?: number; // 0-100 for progress badges
  metadata?: Record<string, any>;
}

export type BadgeType =
  | 'wildlife_spotter'
  | 'plant_identifier'
  | 'geology_enthusiast'
  | 'history_buff'
  | 'scenic_collector'
  | 'water_finder'
  | 'trail_blazer'
  | 'habitat_explorer'
  | 'cultural_curator'
  | 'hidden_gem_finder'
  | 'first_discovery'
  | 'early_bird'
  | 'night_owl'
  | 'streak_keeper'
  | 'distance_champion'
  | 'elevation_conqueror'
  | 'completionist';

export type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface BadgeAward {
  badge: Badge;
  isNew: boolean; // True if this is the first time earning this badge
  previousLevel?: BadgeLevel; // If badge leveled up
  message: string; // Celebration message
}

// Badge definitions
export const BADGE_DEFINITIONS: Record<BadgeType, Omit<Badge, 'id' | 'unlockedAt' | 'progress' | 'metadata'>> = {
  wildlife_spotter: {
    name: 'Wildlife Spotter',
    description: 'Capture wildlife discoveries on the trail',
    icon: '🦌',
    type: 'wildlife_spotter',
    level: 'bronze',
    rarity: 'common',
  },
  plant_identifier: {
    name: 'Plant Identifier',
    description: 'Identify plant species along your hike',
    icon: '🌿',
    type: 'plant_identifier',
    level: 'bronze',
    rarity: 'common',
  },
  geology_enthusiast: {
    name: 'Geology Enthusiast',
    description: 'Discover geological formations',
    icon: '🪨',
    type: 'geology_enthusiast',
    level: 'bronze',
    rarity: 'uncommon',
  },
  history_buff: {
    name: 'History Buff',
    description: 'Uncover historical sites and stories',
    icon: '🏛️',
    type: 'history_buff',
    level: 'bronze',
    rarity: 'uncommon',
  },
  scenic_collector: {
    name: 'Scenic Collector',
    description: 'Capture breathtaking viewpoints',
    icon: '🏔️',
    type: 'scenic_collector',
    level: 'bronze',
    rarity: 'common',
  },
  water_finder: {
    name: 'Water Finder',
    description: 'Discover streams, waterfalls, and lakes',
    icon: '💧',
    type: 'water_finder',
    level: 'bronze',
    rarity: 'common',
  },
  trail_blazer: {
    name: 'Trail Blazer',
    description: 'Find trail markers and waypoints',
    icon: '🪧',
    type: 'trail_blazer',
    level: 'bronze',
    rarity: 'common',
  },
  habitat_explorer: {
    name: 'Habitat Explorer',
    description: 'Explore diverse ecosystems',
    icon: '🏕️',
    type: 'habitat_explorer',
    level: 'bronze',
    rarity: 'uncommon',
  },
  cultural_curator: {
    name: 'Cultural Curator',
    description: 'Discover cultural heritage sites',
    icon: '🎭',
    type: 'cultural_curator',
    level: 'bronze',
    rarity: 'rare',
  },
  hidden_gem_finder: {
    name: 'Hidden Gem Finder',
    description: 'Uncover secret discoveries',
    icon: '💎',
    type: 'hidden_gem_finder',
    level: 'bronze',
    rarity: 'epic',
  },
  first_discovery: {
    name: 'First Discovery',
    description: 'Made your first discovery!',
    icon: '⭐',
    type: 'first_discovery',
    level: 'gold',
    rarity: 'common',
  },
  early_bird: {
    name: 'Early Bird',
    description: 'Started a hike before 7 AM',
    icon: '🌅',
    type: 'early_bird',
    level: 'bronze',
    rarity: 'uncommon',
  },
  night_owl: {
    name: 'Night Owl',
    description: 'Hiked after sunset',
    icon: '🦉',
    type: 'night_owl',
    level: 'bronze',
    rarity: 'uncommon',
  },
  streak_keeper: {
    name: 'Streak Keeper',
    description: 'Hike multiple days in a row',
    icon: '🔥',
    type: 'streak_keeper',
    level: 'bronze',
    rarity: 'uncommon',
  },
  distance_champion: {
    name: 'Distance Champion',
    description: 'Cover impressive distances',
    icon: '🏃',
    type: 'distance_champion',
    level: 'bronze',
    rarity: 'common',
  },
  elevation_conqueror: {
    name: 'Elevation Conqueror',
    description: 'Climb significant elevation',
    icon: '⛰️',
    type: 'elevation_conqueror',
    level: 'bronze',
    rarity: 'uncommon',
  },
  completionist: {
    name: 'Completionist',
    description: 'Capture all discoveries on a trail',
    icon: '🏆',
    type: 'completionist',
    level: 'platinum',
    rarity: 'legendary',
  },
};

// Level colors
export const BADGE_LEVEL_COLORS: Record<BadgeLevel, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};

// Rarity colors
export const BADGE_RARITY_COLORS: Record<BadgeRarity, string> = {
  common: '#6B7280',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

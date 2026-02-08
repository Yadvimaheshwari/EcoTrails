/**
 * Hike Mode Types
 * Types for the gamified discovery-driven hiking experience
 */

// Discovery Node - precomputed points of interest along a trail
export interface DiscoveryNode {
  id: string;
  hikeId: string;
  trailId: string;
  title: string;
  category: DiscoveryCategory;
  lat: number;
  lng: number;
  shortFact: string;
  longDescription?: string;
  imageUrl?: string;
  rarity: 'common' | 'uncommon' | 'rare';
  xp: number;
  source: 'nps' | 'places' | 'curated' | 'user';
  metadata?: Record<string, any>;
}

export type DiscoveryCategory = 
  | 'wildlife'
  | 'plant'
  | 'geology'
  | 'landmark'
  | 'history'
  | 'water'
  | 'viewpoint';

// User's capture of a discovery
export interface DiscoveryCapture {
  id: string;
  nodeId: string;
  hikeId: string;
  userId: string;
  capturedAt: string;
  photoUrl?: string;
  note?: string;
  confidence?: number; // 0-100
  location: { lat: number; lng: number };
}

// Discovery node with distance and status for UI
export interface DiscoveryNodeWithStatus extends DiscoveryNode {
  distanceMeters: number;
  status: 'discovered' | 'nearby' | 'captured' | 'far';
}

// Badge types
export interface Badge {
  id: string;
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  xp: number;
  earnedAt?: string;
  parkId?: string;
  parkName?: string;
}

export type BadgeType =
  | 'first_capture'
  | 'triple_capture'
  | 'category_master'
  | 'hike_complete'
  | 'park_explorer'
  | 'early_bird'
  | 'distance_milestone'
  | 'camera_discovery'
  | 'quest_complete'
  | 'legendary_find';

// Park Badge - earned when completing a hike in a park
export interface ParkBadge {
  id: string;
  parkId: string;
  parkName: string;
  badgeAssetUrl: string;
  npsCode?: string;
  unlockedAt: string;
}

// Hike Mode State
export interface HikeModeState {
  hikeId: string;
  trailId: string;
  trailName: string;
  parkId: string;
  parkName: string;
  status: 'loading' | 'ready' | 'active' | 'paused' | 'completed';
  startTime: number | null;
  elapsedSeconds: number;
  distanceMeters: number;
  elevationGainMeters: number;
  paceMinPerKm: number | null;
  currentLocation: { lat: number; lng: number } | null;
  routePoints: Array<{ lat: number; lng: number; timestamp: number }>;
  discoveryNodes: DiscoveryNode[];
  captures: DiscoveryCapture[];
  nearbyNodes: DiscoveryNode[];
  earnedBadges: Badge[];
}

// Hike Summary for end screen
export interface HikeSummary {
  hikeId: string;
  trailName: string;
  parkName: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  distanceMeters: number;
  elevationGainMeters: number;
  avgPaceMinPerKm: number | null;
  discoveryCount: number;
  captureCount: number;
  totalXp: number;
  newBadges: Badge[];
  parkBadge?: ParkBadge;
  routeGeoJson?: any;
}

// Discovery category metadata
export const DISCOVERY_CATEGORIES: Record<DiscoveryCategory, {
  label: string;
  icon: string;
  color: string;
}> = {
  wildlife: { label: 'Wildlife', icon: '🦌', color: '#F59E0B' },
  plant: { label: 'Plants', icon: '🌿', color: '#10B981' },
  geology: { label: 'Geology', icon: '🪨', color: '#6B7280' },
  landmark: { label: 'Landmarks', icon: '🏔️', color: '#3B82F6' },
  history: { label: 'History', icon: '📜', color: '#8B5CF6' },
  water: { label: 'Water', icon: '💧', color: '#06B6D4' },
  viewpoint: { label: 'Viewpoints', icon: '👁️', color: '#EC4899' },
};

// Rarity metadata
export const RARITY_CONFIG: Record<string, {
  label: string;
  color: string;
  xpMultiplier: number;
}> = {
  common: { label: 'Common', color: '#6B7280', xpMultiplier: 1 },
  uncommon: { label: 'Uncommon', color: '#10B981', xpMultiplier: 1.5 },
  rare: { label: 'Rare', color: '#F59E0B', xpMultiplier: 2 },
};

// Badge definitions
export const BADGE_DEFINITIONS: Record<BadgeType, Omit<Badge, 'id' | 'earnedAt'>> = {
  first_capture: {
    type: 'first_capture',
    name: 'First Discovery',
    description: 'Made your first discovery!',
    icon: '⭐',
    xp: 50,
  },
  triple_capture: {
    type: 'triple_capture',
    name: 'Triple Threat',
    description: 'Captured 3 discoveries in one hike',
    icon: '🎯',
    xp: 100,
  },
  category_master: {
    type: 'category_master',
    name: 'Category Master',
    description: 'Captured 3 discoveries of the same type',
    icon: '🏆',
    xp: 150,
  },
  hike_complete: {
    type: 'hike_complete',
    name: 'Trail Blazer',
    description: 'Completed a hike',
    icon: '🥾',
    xp: 75,
  },
  park_explorer: {
    type: 'park_explorer',
    name: 'Park Explorer',
    description: 'Explored a new park',
    icon: '🏞️',
    xp: 200,
  },
  early_bird: {
    type: 'early_bird',
    name: 'Early Bird',
    description: 'Started a hike before 7 AM',
    icon: '🌅',
    xp: 50,
  },
  distance_milestone: {
    type: 'distance_milestone',
    name: 'Distance Champion',
    description: 'Hiked more than 5 miles',
    icon: '🏃',
    xp: 100,
  },
  camera_discovery: {
    type: 'camera_discovery',
    name: 'Nature Photographer',
    description: 'Made a discovery using the live camera',
    icon: '📸',
    xp: 75,
  },
  quest_complete: {
    type: 'quest_complete',
    name: 'Quest Master',
    description: 'Completed all discoveries on a trail quest',
    icon: '🏅',
    xp: 200,
  },
  legendary_find: {
    type: 'legendary_find',
    name: 'Legendary Find',
    description: 'Discovered a legendary species',
    icon: '👑',
    xp: 300,
  },
};

// Map layer types
export type MapLayerType = 'topo' | 'satellite' | 'terrain' | 'streets';

// Offline map pack status
export interface OfflineMapPack {
  id: string;
  parkId: string;
  trailId?: string;
  status: 'not_downloaded' | 'downloading' | 'ready' | 'failed';
  progress?: number;
  routeGeoJson?: any;
  officialPdfUrl?: string;
  pdfCached: boolean;
  tilesCached: boolean;
  lastUpdated?: string;
}

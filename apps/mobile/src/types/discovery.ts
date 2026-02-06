/**
 * Discovery Types for Gamified Hike Experience (Mobile)
 * Discoveries are points of interest revealed when user is nearby
 */

export interface Discovery {
  id: string;
  trailId: string;
  lat: number;
  lng: number;
  type: DiscoveryType;
  title: string;
  shortText: string;
  longText?: string;
  badgeType: string;
  imageUrl?: string;
  difficulty?: 'common' | 'uncommon' | 'rare' | 'legendary';
  revealRadiusMeters?: number;
  isHidden?: boolean;
  metadata?: Record<string, any>;
}

export type DiscoveryType =
  | 'wildlife'
  | 'plant'
  | 'geological'
  | 'historical'
  | 'scenic_view'
  | 'water_feature'
  | 'trail_marker'
  | 'habitat'
  | 'cultural'
  | 'hidden_gem';

export interface CapturedDiscovery {
  id: string;
  discoveryId: string;
  hikeId: string;
  userId: string;
  capturedAt: string;
  location: {
    lat: number;
    lng: number;
  };
  photoUri?: string;
  notes?: string;
  awardedBadge?: import('./badge').Badge;
}

export interface DiscoveryWithDistance extends Discovery {
  distanceMeters: number;
  isRevealed: boolean;
  isCaptured: boolean;
}

// Discovery icons mapping
export const DISCOVERY_ICONS: Record<DiscoveryType, string> = {
  wildlife: '🦌',
  plant: '🌿',
  geological: '🪨',
  historical: '🏛️',
  scenic_view: '🏔️',
  water_feature: '💧',
  trail_marker: '🪧',
  habitat: '🏕️',
  cultural: '🎭',
  hidden_gem: '💎',
};

// Discovery colors for map markers
export const DISCOVERY_COLORS: Record<DiscoveryType, string> = {
  wildlife: '#F59E0B',
  plant: '#10B981',
  geological: '#6B7280',
  historical: '#8B5CF6',
  scenic_view: '#3B82F6',
  water_feature: '#06B6D4',
  trail_marker: '#EF4444',
  habitat: '#84CC16',
  cultural: '#EC4899',
  hidden_gem: '#F59E0B',
};

// Difficulty rarity labels
export const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  common: { label: 'Common', color: '#6B7280' },
  uncommon: { label: 'Uncommon', color: '#10B981' },
  rare: { label: 'Rare', color: '#3B82F6' },
  legendary: { label: 'Legendary', color: '#F59E0B' },
};

// Default reveal radius in meters
export const DEFAULT_REVEAL_RADIUS_METERS = 150;

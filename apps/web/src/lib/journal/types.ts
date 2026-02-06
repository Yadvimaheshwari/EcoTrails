/**
 * Journal System Type Definitions
 * Comprehensive types for trip planning, hike logging, and discoveries
 */

export type PermitStatus = 'not_started' | 'in_progress' | 'obtained' | 'not_required';
export type OfflineStatus = 'ready' | 'downloading' | 'not_downloaded' | 'error';
export type TransportType = 'not_set' | 'driving' | 'shuttle' | 'public_transit' | 'carpool';
export type DiscoveryCategory = 'wildlife' | 'vegetation' | 'geology' | 'history' | 'other';
export type DifficultyLevel = 'easy' | 'moderate' | 'hard' | 'expert';
export type HikeStatus = 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';
export type AchievementStatus = 'locked' | 'unlocked';

// Trip Planning
export interface TripPlan {
  id: string;
  name: string;
  parkName: string;
  parkId?: string;
  startDate: string;
  endDate: string;
  plannedTrails: PlannedTrail[];
  checklist: ChecklistItem[];
  logistics: LogisticsInfo;
  permits: PermitInfo;
  offlineStatus: OfflineStatus;
  weather?: WeatherSummary;
  wildlife?: WildlifeHighlight[];
  activities?: ActivitySuggestion[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlannedTrail {
  id: string;
  name: string;
  distance: number; // miles
  elevationGain: number; // feet
  difficulty: DifficultyLevel;
  estimatedTime: number; // hours
  startLocation: string;
  highlights?: string[];
  trailheadCoords?: { lat: number; lng: number };
}

export interface ChecklistItem {
  id: string;
  category: 'gear' | 'permits' | 'logistics' | 'safety' | 'food' | 'other';
  item: string;
  completed: boolean;
  required: boolean;
  notes?: string;
}

export interface LogisticsInfo {
  transportation: TransportType;
  parkingDetails?: string;
  shuttleInfo?: string;
  accommodations?: string;
  emergencyContact?: string;
  rangersStation?: string;
}

export interface PermitInfo {
  status: PermitStatus;
  required: boolean;
  permitType?: string;
  confirmationNumber?: string;
  applicationDate?: string;
  notes?: string;
}

export interface WeatherSummary {
  highTemp: number;
  lowTemp: number;
  conditions: string;
  precipitation: number;
  sunrise: string;
  sunset: string;
  alerts?: string[];
}

// Completed Hikes
export interface Hike {
  id: string;
  trailName: string;
  parkName: string;
  parkId?: string;
  trailId?: string;
  status: HikeStatus;
  startTime: string;
  endTime?: string;
  stats: HikeStats;
  route?: RouteData;
  discoveries: Discovery[];
  media: MediaItem[];
  reflection?: string;
  voiceNotes?: VoiceNote[];
  highlights?: string[];
  achievements?: string[]; // Achievement IDs unlocked during this hike
  weather?: string;
  companions?: string[];
}

export interface HikeStats {
  distance: number; // miles
  duration: number; // minutes
  elevationGain: number; // feet
  elevationLoss: number; // feet
  maxAltitude: number; // feet
  avgPace?: number; // minutes per mile
  movingTime?: number; // minutes
  calories?: number;
}

export interface RouteData {
  points: RoutePoint[];
  elevationProfile: ElevationPoint[];
  mapBounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface RoutePoint {
  lat: number;
  lng: number;
  elevation?: number;
  timestamp: string;
}

export interface ElevationPoint {
  distance: number; // miles from start
  elevation: number; // feet
}

export interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnail?: string;
  timestamp: string;
  location?: { lat: number; lng: number };
  caption?: string;
}

export interface VoiceNote {
  id: string;
  url: string;
  duration: number; // seconds
  timestamp: string;
  transcription?: string;
}

// Discoveries
export interface Discovery {
  id: string;
  category: DiscoveryCategory;
  name: string;
  commonName?: string;
  scientificName?: string;
  description: string;
  confidence: number; // 0-100
  location: { lat: number; lng: number };
  elevation?: number;
  parkName: string;
  hikeId: string;
  timestamp: string;
  photo?: string;
  aiInsights?: {
    habitat?: string;
    behavior?: string;
    season?: string;
    conservation?: string;
    funFacts?: string[];
  };
}

// Achievements
export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  status: AchievementStatus;
  unlockedAt?: string;
  unlockedHikeId?: string;
  progress?: {
    current: number;
    target: number;
    unit: string;
  };
}

// Stats & Progress
export interface UserStats {
  parksExplored: number;
  trailsCompleted: number;
  totalElevationGained: number; // feet
  totalDistance: number; // miles
  discoveriesLogged: number;
  achievementsUnlocked: number;
  explorerLevel: number;
  nextMilestone: {
    name: string;
    progress: number; // 0-100
    description: string;
  };
}

// Active Hike Context
export interface ActiveHikeContext {
  hikeId: string;
  trailName: string;
  startTime: string;
  elapsedTime: number; // seconds
  gpsStatus: 'good' | 'fair' | 'poor' | 'unavailable';
  isOffline: boolean;
  currentLocation?: { lat: number; lng: number };
}

// Wildlife & Activities (for trip planning)
export interface WildlifeHighlight {
  species: string;
  likelihood: 'high' | 'medium' | 'low';
  season: string;
  bestTime: string;
  tips: string;
}

export interface ActivitySuggestion {
  name: string;
  description: string;
  location?: string;
  timing?: string;
  difficulty?: DifficultyLevel;
}

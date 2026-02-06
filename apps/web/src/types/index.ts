/**
 * TypeScript types for EcoAtlas entities
 * Single source of truth matching backend Pydantic schemas
 */

// Location type for JSON fields
export interface Location {
  lat: number;
  lng: number;
}

// Place Type
export interface Place {
  id: string;
  name: string;
  place_type: 'park' | 'trail' | 'area';
  location?: Location | [number, number] | null;
  description?: string | null;
  meta_data?: Record<string, any> | null;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

// Trail Type
export interface Trail {
  id: string;
  place_id: string;
  name: string;
  difficulty?: 'easy' | 'moderate' | 'hard' | 'expert' | null;
  distance_miles?: number | null;
  elevation_gain_feet?: number | null;
  estimated_duration_minutes?: number | null;
  description?: string | null;
  meta_data?: Record<string, any> | null;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  place?: Place | null;
}

// Media Type
export interface Media {
  id: string;
  hike_id: string;
  segment_id?: string | null;
  type: 'photo' | 'video' | 'audio';
  category?: string | null; // 'trailhead', 'summit', 'wildlife', etc.
  storage_key: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
  location?: Location | null;
  meta_data?: Record<string, any> | null;
  synced_at?: string | null; // ISO datetime string
  created_at: string; // ISO datetime string
}

// Hike Type
export interface Hike {
  id: string;
  user_id: string;
  trail_id?: string | null;
  place_id?: string | null;
  status: 'active' | 'completed' | 'paused';
  start_time: string; // ISO datetime string
  end_time?: string | null; // ISO datetime string
  distance_miles?: number | null;
  duration_minutes?: number | null;
  elevation_gain_feet?: number | null;
  max_altitude_feet?: number | null;
  weather?: Record<string, any> | null;
  meta_data?: Record<string, any> | null;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  // Relationships (optional, populated when using joinedload)
  trail?: Trail | null;
  media?: Media[] | null;
  route_points?: Array<Record<string, any>> | null;
  discoveries?: Array<Record<string, any>> | null;
}

// JournalEntry Type
export interface JournalEntry {
  id: string;
  user_id: string;
  hike_id?: string | null;
  entry_type: 'legacy' | 'reflection' | 'note' | 'trip_plan' | 'hike_summary';
  title?: string | null;
  content: string;
  meta_data?: Record<string, any> | null;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

// Legacy Discovery Type (for backward compatibility with existing code)
export interface LegacyDiscovery {
  type: string;
  description?: string;
  location?: { elevation?: number } | null;
  hike_id?: string;
  hike_name?: string;
  journal_entry_id?: string;
}

// Alias for backward compatibility
export type Discovery = LegacyDiscovery;

// Re-export new gamified discovery/badge types
// Note: Import these directly from '@/types/discovery' and '@/types/badge'
// to avoid naming conflicts with LegacyDiscovery

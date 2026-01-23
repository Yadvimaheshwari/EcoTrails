
export enum AppView {
  ONBOARDING = 'onboarding',
  PARK_SELECTION = 'park_selection',
  DASHBOARD = 'explore',
  JOURNAL = 'journal',
  TERRAIN = 'terrain',
  STUDIO = 'studio',
  ANALYSIS = 'analysis',
  REPORT = 'report',
  INGESTION = 'ingestion',
  BRIEFING = 'briefing',
  ACCOUNT = 'account'
}

export type InterfaceState = 
  | 'minimize interface' 
  | 'show ambient indicators' 
  | 'expand insights' 
  | 'defer interaction' 
  | 'present summary';

export type ConfidenceLevel = 'Low' | 'Medium' | 'High';

export interface SensorDevice {
  id: string;
  name: string;
  type: 'HeartRate' | 'Barometer' | 'GPS' | 'Acoustic';
  status: 'connected' | 'disconnected';
  battery: number;
}

export interface MediaSegment {
  id: string;
  base64: string;
  mimeType: string;
  timestamp: number;
  quality_score: number;
  is_privacy_safe: boolean;
  metadata: any;
}

export interface AcousticAnalysis {
  summary: string;
  richness: 'low' | 'moderate' | 'high';
  confidence_notes: string;
}

export interface FusionAnalysis {
  consistent_observations: string[];
  divergent_observations: string[];
  unclear_areas: string[];
}

export interface VisualArtifact {
  url: string;
  title: string;
  description: string;
}

export interface AgentDefinition {
  name: string;
  role: string;
  goal: string;
  backstory: string;
  model: string;
  tools: any[];
}

export interface ObservationEvent {
  timestamp: number;
  type: string;
  description: string;
}

export interface EnvironmentalRecord {
  id: string;
  timestamp: number;
  park_name: string;
  location: { lat: number; lng: number; name: string; };
  confidence: ConfidenceLevel;
  summary: string;
  multimodalEvidence: string[];
  tags: string[];
  observation_events?: ObservationEvent[];
  acoustic_analysis?: AcousticAnalysis;
  fusion_analysis?: FusionAnalysis;
  field_narrative?: {
    consistent: string;
    different: string;
    changing: string;
    uncertain: string;
  };
  spatial_insight?: {
    text: string;
    sources: any[];
  };
  temporal_delta?: string;
  visual_artifact?: string;
  experience_synthesis?: {
    confidence: ConfidenceLevel;
    trail_difficulty_perception: string;
    beginner_tips: string[];
  };
}

export interface TrailBriefing {
  park_name: string;
  location_summary: string;
  terrain_profile: string[];
  environmental_baseline: string;
  difficulty: string;
  elevation_gain: string;
  length: string;
  recent_alerts: string[];
  weather_forecast: string;
  sources: any[];
}

export interface MediaPacket {
  sessionId: string;
  segments: MediaSegment[];
  discarded_count: number;
  status: 'validated' | 'rejected' | 'partial';
}

export interface SensorData {
  altitude: number;
  heart_rate: number;
  pressure: number;
  uv_index: number;
  battery: number;
  signal_strength: number;
  velocity: number;
  climb_rate: number;
  cadence: number;
}

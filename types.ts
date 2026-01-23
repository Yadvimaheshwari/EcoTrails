export enum AppView {
  DASHBOARD = 'explore',
  JOURNAL = 'journal',
  TERRAIN = 'terrain',
  STUDIO = 'studio',
  REPORT = 'report',
  INGESTION = 'ingestion'
}

export type ArtifactType = 'map_overlay' | 'insight_card' | 'change_visual' | '3d_texture';

export type ConfidenceLevel = 'Low' | 'Medium' | 'High';

export interface UncertaintyMetadata {
  confidence: ConfidenceLevel;
  uncertainty_explanation: string;
  improvement_suggestion: string;
}

// Media Ingestion Models
export interface MediaSegment {
  id: string;
  base64: string;
  mimeType: string;
  timestamp: number;
  quality_score: number;
  is_privacy_safe: boolean;
  metadata: {
    lat?: number;
    lng?: number;
    alt?: number;
  };
}

export interface MediaPacket {
  sessionId: string;
  segments: MediaSegment[];
  discarded_count: number;
  status: 'validated' | 'rejected' | 'partial';
}

// Data Models
export interface EnvironmentalRecord {
  id: string;
  timestamp: number;
  location: {
    lat: number;
    lng: number;
    name: string;
  };
  confidence: ConfidenceLevel;
  summary: string;
  multimodalEvidence: string[];
  tags: string[];
  vitals_narrative?: string;
  change_analysis?: string;
  temporal_delta?: TemporalChangeResult;
  acoustic_profile?: AcousticResult;
  experience_synthesis?: SynthesisResult;
  field_narrative?: NarrationResult;
}

// Agent Results
export interface TemporalChangeResult extends UncertaintyMetadata {
  detected_changes: Array<{
    feature: 'Vegetation' | 'Soil' | 'Trail' | 'Water' | 'Atmosphere';
    description: string;
    magnitude: 'Minimal' | 'Moderate' | 'Significant';
    confidence: number;
  }>;
  seasonal_alignment: string;
  historical_comparison_summary: string;
}

export interface AcousticResult extends UncertaintyMetadata {
  soundscape_summary: string;
  activity_levels: {
    birds: 'Low' | 'Medium' | 'High';
    insects: 'Low' | 'Medium' | 'High';
    water: 'None' | 'Trickle' | 'Flowing' | 'Rushing';
    wind: 'Still' | 'Breeze' | 'Strong';
    human_noise: 'None' | 'Distant' | 'Intrusive';
  };
  notable_changes: string;
}

export interface SynthesisResult extends UncertaintyMetadata {
  trail_difficulty_perception: string;
  fatigue_zones: string[];
  exposure_stress: {
    level: 'Low' | 'Moderate' | 'High';
    factors: string[];
  };
  accessibility_notes: string;
  beginner_tips: string[];
  safety_observations: string[];
}

export interface PerceptionResult extends UncertaintyMetadata {
  environmental_signals: Array<{
    type: string;
    value: string;
    observation: string;
  }>;
  patterns: string[];
}

export interface VisualArtifact {
  url: string;
  title: string;
  description: string;
}

export interface NarrationResult {
  overview: string;
  revelations: string;
  changes: string;
  future_notes: string;
}

export interface AgentDefinition {
  name: string;
  role: string;
  goal: string;
  backstory: string;
  model: string;
  tools: any[];
}

export interface CrewResult {
  output: any;
}
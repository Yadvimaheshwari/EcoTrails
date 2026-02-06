/**
 * Discovery Components Index (Mobile)
 * 
 * Includes Pokemon Go-style camera discovery and quest system
 * powered by Gemini Vision AI
 */

export { TrailSelectSheet } from './TrailSelectSheet';
export { DiscoveryMarker } from './DiscoveryMarker';
export { DiscoveryCard } from './DiscoveryCard';
export { CaptureModal } from './CaptureModal';
export { BadgeToast } from './BadgeToast';
export { HikeSummaryModal } from './HikeSummaryModal';

// New Pokemon Go-style discovery features
export { LiveCameraDiscovery } from './LiveCameraDiscovery';
export { DiscoveryQuest, generateQuestItems } from './DiscoveryQuest';
export type { QuestItem } from './DiscoveryQuest';

// Checkpoint system
export { CheckpointCard } from './CheckpointCard';
export { ActivityModal } from './ActivityModal';
export type { TrailCheckpoint, CheckpointActivity, CheckpointProgress } from './CheckpointCard';

'use client';

/**
 * Checkpoint Sheet Component
 * Displays checkpoint details and unlockable activities
 */

import React, { useState } from 'react';
import { ActivityModal } from './ActivityModal';

export interface CheckpointActivity {
  id: string;
  type: 'observation' | 'photo_challenge' | 'trivia' | 'scavenger_hunt' | 'audio_listen' | 'mindfulness' | 'exploration';
  title: string;
  description: string;
  xp: number;
  prompt: string;
  completion_criteria: any;
  estimated_minutes?: number;
  educational_note?: string;
}

export interface TrailCheckpoint {
  id: string;
  name: string;
  description: string;
  sequence: number;
  location: { lat: number; lng: number };
  distance_from_start_meters: number;
  elevation_feet?: number;
  activities: CheckpointActivity[];
  photo_url?: string;
}

export interface CheckpointProgress {
  checkpoint_id: string;
  activities_completed: string[];
  xp_earned: number;
  reached_at?: string;
}

interface CheckpointSheetProps {
  checkpoint: TrailCheckpoint;
  isNearby: boolean;
  progress: CheckpointProgress;
  onActivityComplete: (activityId: string, proof: any) => Promise<void>;
}

const ACTIVITY_ICONS: Record<string, string> = {
  observation: '👁️',
  photo_challenge: '📸',
  trivia: '🧠',
  scavenger_hunt: '🔍',
  audio_listen: '👂',
  mindfulness: '🧘',
  exploration: '🗺️',
};

function getActivityIcon(type: string): string {
  return ACTIVITY_ICONS[type] || '✨';
}

export function CheckpointSheet({ checkpoint, isNearby, progress, onActivityComplete }: CheckpointSheetProps) {
  const [selectedActivity, setSelectedActivity] = useState<CheckpointActivity | null>(null);
  const [completing, setCompleting] = useState(false);

  const handleCompleteActivity = async (proof: any) => {
    if (!selectedActivity) return;
    
    setCompleting(true);
    try {
      await onActivityComplete(selectedActivity.id, proof);
      setSelectedActivity(null);
    } catch (err) {
      console.error('Failed to complete activity:', err);
    } finally {
      setCompleting(false);
    }
  };

  const completedActivities = progress.activities_completed || [];
  const totalActivities = checkpoint.activities.length;
  const completedCount = completedActivities.length;

  return (
    <div className="bg-white rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto">
      {/* Checkpoint Header */}
      <div className="mb-6">
        {checkpoint.photo_url && (
          <div className="w-full h-48 mb-4 rounded-xl overflow-hidden">
            <img 
              src={checkpoint.photo_url} 
              alt={checkpoint.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-2xl font-display font-bold text-pineGreen flex-1">
            {checkpoint.name}
          </h2>
          <div className="ml-4 px-3 py-1 bg-mossGreen/10 rounded-full">
            <span className="text-sm font-semibold text-mossGreen">
              #{checkpoint.sequence}
            </span>
          </div>
        </div>
        
        <p className="text-slate-600 mb-3">{checkpoint.description}</p>
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-slate-500">
          {checkpoint.elevation_feet && (
            <div className="flex items-center gap-1">
              <span>⛰️</span>
              <span>{checkpoint.elevation_feet.toLocaleString()} ft</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span>📍</span>
            <span>{Math.round(checkpoint.distance_from_start_meters)} m</span>
          </div>
          <div className="flex items-center gap-1">
            <span>✨</span>
            <span>{progress.xp_earned} XP earned</span>
          </div>
        </div>
        
        {!isNearby && (
          <div className="mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 flex items-center gap-2">
              <span className="text-lg">🚶‍♂️</span>
              <span>Keep hiking to unlock activities at this checkpoint</span>
            </p>
          </div>
        )}
        
        {isNearby && (
          <div className="mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-800 flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span>
                {completedCount === totalActivities 
                  ? 'All activities completed!'
                  : `${completedCount}/${totalActivities} activities completed`
                }
              </span>
            </p>
          </div>
        )}
      </div>
      
      {/* Activities Grid */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900 mb-3">Activities</h3>
        
        {checkpoint.activities.map(activity => {
          const isCompleted = completedActivities.includes(activity.id);
          const isLocked = !isNearby;
          
          return (
            <button
              key={activity.id}
              onClick={() => !isLocked && !isCompleted && setSelectedActivity(activity)}
              disabled={isLocked || isCompleted}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                isCompleted 
                  ? 'bg-emerald-50 border-emerald-200'
                  : isLocked
                  ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                  : 'bg-white border-slate-200 hover:border-mossGreen hover:bg-mossGreen/5 cursor-pointer'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                    <h3 className="font-semibold text-slate-900">{activity.title}</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{activity.description}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                      +{activity.xp} XP
                    </span>
                    {activity.estimated_minutes && (
                      <span className="text-xs text-slate-500">
                        ⏱️ {activity.estimated_minutes} min
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-xs font-medium px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                        ✓ Completed
                      </span>
                    )}
                    {isLocked && (
                      <span className="text-xs text-slate-500">
                        🔒 Locked
                      </span>
                    )}
                  </div>
                  {activity.educational_note && isCompleted && (
                    <div className="mt-2 text-xs text-slate-500 italic">
                      💡 {activity.educational_note}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Activity Modal */}
      {selectedActivity && (
        <ActivityModal
          activity={selectedActivity}
          isCompleting={completing}
          onComplete={handleCompleteActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
}

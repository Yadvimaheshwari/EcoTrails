'use client';

import { useState, useEffect } from 'react';
import { startMediaEnhancement, getEnhancementJobStatus, cancelEnhancementJob } from '@/lib/api';
import type { Media } from '@/types';

interface MediaEnhancementJobProps {
  media: Media;
  onEnhanced?: (enhancedUrl: string) => void;
}

interface EnhancementJob {
  id: string;
  media_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  options: Record<string, any>;
  created_at: string;
  updated_at: string;
  error?: string;
  enhanced_url?: string;
}

export function MediaEnhancementJob({ media, onEnhanced }: MediaEnhancementJobProps) {
  const [optIn, setOptIn] = useState(false);
  const [job, setJob] = useState<EnhancementJob | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<'natural' | 'cinematic' | 'vintage' | 'modern'>('natural');
  const [lighting, setLighting] = useState<'natural' | 'golden_hour' | 'dramatic'>('natural');

  // Only show for photos
  if (media.type !== 'photo') {
    return null;
  }

  // Check if already enhanced
  const enhancedUrl = (media.meta_data as any)?.enhanced_url;
  const hasEnhanced = !!enhancedUrl;

  // Load existing job on mount
  useEffect(() => {
    if (optIn && !job) {
      // Check if there's an active job (would need to fetch from backend)
      // For now, we'll start fresh
    }
  }, [optIn, job]);

  // Poll job status if job is active
  useEffect(() => {
    if (!job || job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await getEnhancementJobStatus(job.id);
        const updatedJob = response.data as EnhancementJob;
        setJob(updatedJob);

        if (updatedJob.status === 'completed') {
          if (updatedJob.enhanced_url) {
            onEnhanced?.(updatedJob.enhanced_url);
          }
          // Stop polling once completed
          clearInterval(pollInterval);
        } else if (updatedJob.status === 'failed' || updatedJob.status === 'cancelled') {
          // Stop polling on failure or cancellation
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Failed to poll job status:', err);
        // On error, stop polling to avoid infinite errors
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [job, onEnhanced]);

  const handleStartEnhancement = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await startMediaEnhancement(media.id, {
        lighting,
        style,
        enhance_subject: true,
        remove_shadows: false,
        background_replacement: false,
      });

      if (response.data?.job_id) {
        setJob({
          id: response.data.job_id,
          media_id: media.id,
          status: 'queued',
          options: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        setError('Failed to start enhancement job');
      }
    } catch (err: any) {
      console.error('Failed to start enhancement:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to start enhancement');
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancel = async () => {
    if (!job) return;

    try {
      await cancelEnhancementJob(job.id);
      setJob({ ...job, status: 'cancelled' });
    } catch (err: any) {
      console.error('Failed to cancel job:', err);
      setError('Failed to cancel enhancement job');
    }
  };

  return (
    <div className="space-y-2">
      {/* Opt-in Checkbox */}
      {!hasEnhanced && !job && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-textSecondary">
            Enhance photo with AI (optional)
          </span>
        </label>
      )}

      {/* Start Button */}
      {optIn && !job && !hasEnhanced && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as any)}
              className="px-2 py-1.5 rounded-lg text-xs"
              style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3', color: '#5F6F6A' }}
              aria-label="Enhancement style"
            >
              <option value="natural">Natural</option>
              <option value="cinematic">Cinematic</option>
              <option value="vintage">Vintage</option>
              <option value="modern">Modern</option>
            </select>
            <select
              value={lighting}
              onChange={(e) => setLighting(e.target.value as any)}
              className="px-2 py-1.5 rounded-lg text-xs"
              style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3', color: '#5F6F6A' }}
              aria-label="Lighting preset"
            >
              <option value="natural">Natural light</option>
              <option value="golden_hour">Golden hour</option>
              <option value="dramatic">Dramatic</option>
            </select>
          </div>
          <button
            onClick={handleStartEnhancement}
            disabled={isStarting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#4F8A6B' }}
          >
            {isStarting ? 'Starting...' : '✨ Start Enhancement'}
          </button>
        </div>
      )}

      {/* Job Status */}
      {job && (
        <div className="p-3 rounded-xl" style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {job.status === 'queued' && <span className="text-sm">⏳ Queued</span>}
              {job.status === 'processing' && (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2" style={{ borderColor: '#4C7EF3' }}></div>
                  <span className="text-sm">Processing...</span>
                </>
              )}
              {job.status === 'completed' && <span className="text-sm">✅ Completed</span>}
              {job.status === 'failed' && <span className="text-sm">❌ Failed</span>}
              {job.status === 'cancelled' && <span className="text-sm">🚫 Cancelled</span>}
            </div>
            {job.status === 'queued' || job.status === 'processing' ? (
              <button
                onClick={handleCancel}
                className="px-2 py-1 rounded text-xs transition-colors"
                style={{ backgroundColor: '#FFF8F0', border: '1px solid #F4A34040', color: '#F4A340' }}
              >
                Cancel
              </button>
            ) : null}
          </div>
          {job.error && (
            <div className="text-xs text-textSecondary mt-1">{job.error}</div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-2 rounded-lg text-xs text-textSecondary" style={{ backgroundColor: '#FFF8F0', border: '1px solid #F4A34040' }}>
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Enhanced Version Available */}
      {hasEnhanced && (
        <div className="p-2 rounded-lg text-xs" style={{ backgroundColor: '#E8F4F8', border: '1px solid #4C7EF340' }}>
          <span className="text-textSecondary">✨ Enhanced version available</span>
        </div>
      )}
    </div>
  );
}

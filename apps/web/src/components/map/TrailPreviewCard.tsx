'use client';

import { useState } from 'react';
import { X, Footprints, TrendingUp, Clock, Download, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { formatMiles, formatFeet, formatDuration } from '@/lib/formatting';

interface TrailPreviewCardProps {
  trail: {
    id?: string;
    name?: string;
    difficulty?: string;
    distance?: number | null;
    elevationGain?: number | null;
    estimatedTime?: number | null;
  };
  hasGeometry: boolean;
  onClose: () => void;
  onViewDetails: () => void;
  onStartHike: () => void;
}

const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  hard: 'bg-orange-100 text-orange-700 border-orange-200',
  expert: 'bg-red-100 text-red-700 border-red-200',
};

type OfflineStatus = 'not_downloaded' | 'downloading' | 'ready' | 'failed';

export function TrailPreviewCard({
  trail,
  hasGeometry,
  onClose,
  onViewDetails,
  onStartHike,
}: TrailPreviewCardProps) {
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>(() => {
    // Check if already downloaded
    if (typeof window !== 'undefined' && trail.id) {
      const cached = localStorage.getItem(`offline_trail_${trail.id}`);
      return cached ? 'ready' : 'not_downloaded';
    }
    return 'not_downloaded';
  });

  const difficultyColor =
    DIFFICULTY_COLORS[trail.difficulty?.toLowerCase() as keyof typeof DIFFICULTY_COLORS] ||
    DIFFICULTY_COLORS.moderate;

  const handleDownloadOffline = async () => {
    if (offlineStatus === 'downloading' || offlineStatus === 'ready') return;
    
    setOfflineStatus('downloading');
    
    try {
      // Simulate download (in production, this would fetch actual map tiles)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Store trail data for offline use
      const offlineData = {
        id: trail.id,
        name: trail.name,
        difficulty: trail.difficulty,
        distance: trail.distance,
        elevationGain: trail.elevationGain,
        estimatedTime: trail.estimatedTime,
        downloadedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(`offline_trail_${trail.id}`, JSON.stringify(offlineData));
      setOfflineStatus('ready');
    } catch (error) {
      console.error('[TrailPreviewCard] Offline download failed:', error);
      setOfflineStatus('failed');
    }
  };

  return (
    <>
      {/* Mobile: Bottom Sheet */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white rounded-t-3xl shadow-2xl">
          <div className="p-4">
            {/* Handle */}
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 pr-3">
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  {trail.name || 'Trail Details'}
                </h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${difficultyColor}`}>
                  {trail.difficulty || 'Moderate'}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Route data warning */}
            {!hasGeometry && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Route data unavailable for this trail
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Distance</p>
                  <p className="text-sm font-semibold text-slate-800">{formatMiles(trail.distance)} mi</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Elevation</p>
                  <p className="text-sm font-semibold text-slate-800">{formatFeet(trail.elevationGain)} ft</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Time</p>
                  <p className="text-sm font-semibold text-slate-800">{formatDuration(trail.estimatedTime)}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={onViewDetails}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 transition-colors font-semibold"
              >
                View Details
              </button>
              <button
                onClick={onStartHike}
                className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
              >
                Start Hike
              </button>
            </div>

            {/* Download Offline Map Button */}
            <button
              onClick={handleDownloadOffline}
              disabled={offlineStatus === 'downloading'}
              className={`w-full py-2.5 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                offlineStatus === 'ready'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : offlineStatus === 'failed'
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {offlineStatus === 'not_downloaded' && (
                <>
                  <Download className="w-4 h-4" />
                  Download offline map
                </>
              )}
              {offlineStatus === 'downloading' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Downloading...
                </>
              )}
              {offlineStatus === 'ready' && (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Offline ready
                </>
              )}
              {offlineStatus === 'failed' && (
                <>
                  <Download className="w-4 h-4" />
                  Retry download
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Floating Card */}
      <div className="hidden lg:block absolute bottom-6 left-6 z-40 w-80 animate-in fade-in slide-in-from-left duration-300">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 pr-3">
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  {trail.name || 'Trail Details'}
                </h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${difficultyColor}`}>
                  {trail.difficulty || 'Moderate'}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* No geometry warning */}
            {!hasGeometry && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Route data unavailable for this trail
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">Distance:</span>
                <span className="text-sm font-semibold text-slate-800">{formatMiles(trail.distance)} mi</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">Elevation Gain:</span>
                <span className="text-sm font-semibold text-slate-800">{formatFeet(trail.elevationGain)} ft</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">Est. Time:</span>
                <span className="text-sm font-semibold text-slate-800">{formatDuration(trail.estimatedTime)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={onViewDetails}
                className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
              >
                View Details
              </button>
              <button
                onClick={onStartHike}
                className="flex-1 py-2.5 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
              >
                Start Hike
              </button>
            </div>

            {/* Download Offline Map Button */}
            <button
              onClick={handleDownloadOffline}
              disabled={offlineStatus === 'downloading'}
              className={`w-full py-2 px-4 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2 ${
                offlineStatus === 'ready'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : offlineStatus === 'failed'
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {offlineStatus === 'not_downloaded' && (
                <>
                  <Download className="w-4 h-4" />
                  Download offline map
                </>
              )}
              {offlineStatus === 'downloading' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Downloading...
                </>
              )}
              {offlineStatus === 'ready' && (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Offline ready
                </>
              )}
              {offlineStatus === 'failed' && (
                <>
                  <Download className="w-4 h-4" />
                  Retry download
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * TrailSelectSheet Component
 * Bottom sheet for trail selection on park page
 * Replaces the side panel pattern - clean, focused, minimal UI
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  X, 
  Footprints, 
  TrendingUp, 
  Clock, 
  MapPin, 
  Download,
  Loader2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { FrontendTrail } from '@/lib/trailTransform';
import { formatMiles, formatFeet, formatDuration } from '@/lib/formatting';

interface TrailSelectSheetProps {
  isOpen: boolean;
  trail: FrontendTrail | null;
  parkName?: string;
  weather?: any;
  onClose: () => void;
  onStartHike: () => void;
  onDownloadOffline?: () => void;
  loading?: boolean;
  offlineEnabled?: boolean;
  offlineDownloadLoading?: boolean;
  offlineDisabledReason?: string;
}

// Difficulty badge colors
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  hard: 'bg-orange-100 text-orange-700 border-orange-200',
  expert: 'bg-red-100 text-red-700 border-red-200',
  unknown: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function TrailSelectSheet({
  isOpen,
  trail,
  parkName,
  weather,
  onClose,
  onStartHike,
  onDownloadOffline,
  loading = false,
  offlineEnabled = false,
  offlineDownloadLoading = false,
  offlineDisabledReason,
}: TrailSelectSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [touchStartY, setTouchStartY] = useState(0);
  const [currentTranslateY, setCurrentTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Handle keyboard escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle swipe-to-dismiss on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - touchStartY;
    if (deltaY > 0) {
      setCurrentTranslateY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (currentTranslateY > 100) {
      onClose();
    }
    setCurrentTranslateY(0);
    setIsDragging(false);
  };

  if (!isOpen || !trail) return null;

  const difficultyKey = trail.difficulty?.toLowerCase() || 'unknown';
  const difficultyColor = DIFFICULTY_COLORS[difficultyKey] || DIFFICULTY_COLORS.unknown;
  const hasRouteData = !!(trail.lat || trail.lng);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
        onClick={onClose}
        style={{ opacity: isOpen ? 1 : 0 }}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out"
        style={{
          transform: `translateY(${currentTranslateY}px)`,
          maxHeight: '85vh',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">
                {trail.name}
              </h2>
              {parkName && (
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {parkName}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 -mt-1 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          {/* Difficulty + Type Pills */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${difficultyColor}`}>
              {trail.difficulty || 'Unknown difficulty'}
            </span>
            {trail.loopType && (
              <span className="px-3 py-1 rounded-full text-sm bg-slate-100 text-slate-600">
                {trail.loopType}
              </span>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <Footprints className="w-5 h-5 text-slate-500 mx-auto mb-1" />
              <p className="text-lg font-semibold text-slate-800">
                {formatMiles(trail.distance)}
              </p>
              <p className="text-xs text-slate-500">miles</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <TrendingUp className="w-5 h-5 text-slate-500 mx-auto mb-1" />
              <p className="text-lg font-semibold text-slate-800">
                {formatFeet(trail.elevationGain)}
              </p>
              <p className="text-xs text-slate-500">ft gain</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <Clock className="w-5 h-5 text-slate-500 mx-auto mb-1" />
              <p className="text-lg font-semibold text-slate-800">
                {formatDuration(trail.estimatedTime)}
              </p>
              <p className="text-xs text-slate-500">est. time</p>
            </div>
          </div>

          {/* Description */}
          {trail.description && (
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              {trail.description}
            </p>
          )}

          {/* Route Data Warning */}
          {!hasRouteData && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Route preview unavailable</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  GPS tracking will still work during your hike.
                </p>
              </div>
            </div>
          )}

          {/* Weather Info */}
          {weather && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">☁️</span>
                  <span className="text-sm font-medium text-slate-700">
                    {weather.temperature ? `${weather.temperature}°F` : 'Weather data'}
                  </span>
                </div>
                {weather.conditions && (
                  <span className="text-sm text-slate-600">{weather.conditions}</span>
                )}
              </div>
            </div>
          )}

          {/* What You Can Find */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-medium text-emerald-800 mb-2">What you can find:</p>
            <div className="flex items-center gap-3">
              <span className="text-xl" title="Wildlife">🦌</span>
              <span className="text-xl" title="Plants">🌿</span>
              <span className="text-xl" title="Geology">🪨</span>
              <span className="text-xl" title="Landmarks">🏔️</span>
              <span className="text-xl" title="Viewpoints">👁️</span>
              <span className="text-xl" title="History">📜</span>
            </div>
            <p className="text-xs text-emerald-700 mt-2">
              Earn XP by discovering hidden points of interest!
            </p>
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-white">
          <div className="flex gap-3">
            {/* Download Offline Button */}
            <button
              onClick={onDownloadOffline}
              disabled={!offlineEnabled || offlineDownloadLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              title={
                offlineDownloadLoading
                  ? 'Downloading…'
                  : offlineEnabled
                    ? 'Download offline PDF map'
                    : offlineDisabledReason || 'Offline map unavailable'
              }
            >
              {offlineDownloadLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </button>

            {/* Start Hike Button */}
            <button
              onClick={onStartHike}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold transition-all hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>🥾</span>
                  Start Hike
                </span>
              )}
            </button>
          </div>

          {/* Offline Note */}
          {!offlineEnabled && (
            <p className="text-xs text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
              <Info className="w-3 h-3" />
              {offlineDisabledReason || 'Official PDF not available'}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

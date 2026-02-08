'use client';

import { TrendingUp, Clock, Mountain, Footprints, Award, MapPin, Star } from 'lucide-react';
import { formatMiles, formatFeet, formatDuration } from '@/lib/formatting';

interface TrailCardProps {
  trail: {
    id?: string;
    name?: string;
    difficulty?: string;
    distance?: number | null; // miles
    elevationGain?: number | null; // feet
    estimatedTime?: number | null; // hours
    loopType?: string;
    surface?: string;
    tags?: string[];
    rating?: number | null;
    userRatingsTotal?: number | null;
    isTrailhead?: boolean;
    lat?: number | null;
    lng?: number | null;
  };
  onClick: () => void;
  showTrailheadBadge?: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  hard: 'bg-orange-100 text-orange-700 border-orange-200',
  expert: 'bg-red-100 text-red-700 border-red-200',
  unknown: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function TrailCard({ trail, onClick, showTrailheadBadge }: TrailCardProps) {
  const difficultyKey = trail.difficulty?.toLowerCase() || 'unknown';
  const difficultyColor = DIFFICULTY_COLORS[difficultyKey] || DIFFICULTY_COLORS.unknown;
  const isTrailhead = showTrailheadBadge || trail.isTrailhead;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border-2 border-transparent hover:border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 pr-3">
          <h3 className="text-lg font-bold text-slate-800 mb-1">
            {trail.name || 'Unnamed Trail'}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Difficulty badge - only show if known */}
            {difficultyKey !== 'unknown' ? (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${difficultyColor}`}>
                {trail.difficulty}
              </span>
            ) : (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${difficultyColor}`}>
                Difficulty unknown
              </span>
            )}
            {trail.loopType && (
              <span className="text-xs text-slate-500">
                {trail.loopType}
              </span>
            )}
            {/* Rating if available (from Google Places) */}
            {trail.rating != null && trail.rating > 0 && (
              <span className="flex items-center gap-1 text-xs text-slate-600">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {trail.rating.toFixed(1)}
                {trail.userRatingsTotal != null && trail.userRatingsTotal > 0 && (
                  <span className="text-slate-400">({trail.userRatingsTotal})</span>
                )}
              </span>
            )}
          </div>
        </div>
        
        {/* Tags and badges */}
        <div className="flex gap-1 flex-wrap justify-end">
          {/* Trailhead badge */}
          {isTrailhead && (
            <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-md font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Trailhead
            </span>
          )}
          {trail.tags && trail.tags.includes('popular') && (
            <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md font-medium">
              🔥 Popular
            </span>
          )}
          {trail.tags && trail.tags.includes('wildlife') && (
            <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md font-medium">
              🦌
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          <Footprints className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Distance</p>
            <p className="text-sm font-semibold text-slate-800">
              {formatMiles(trail.distance) !== '–' ? `${formatMiles(trail.distance)} mi` : '–'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Elevation</p>
            <p className="text-sm font-semibold text-slate-800">
              {formatFeet(trail.elevationGain) !== '–' ? `${formatFeet(trail.elevationGain)} ft` : '–'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Time</p>
            <p className="text-sm font-semibold text-slate-800">{formatDuration(trail.estimatedTime)}</p>
          </div>
        </div>
      </div>
      
      {/* Data unavailable notice for trailheads */}
      {isTrailhead && trail.distance == null && trail.elevationGain == null && (
        <p className="text-xs text-slate-400 mb-2 italic">
          Trail details unavailable • Use trailhead location as starting point
        </p>
      )}

      {/* Mini Elevation Profile */}
      <div className="h-8 bg-slate-50 rounded-lg overflow-hidden relative flex items-center justify-center">
        {trail.elevationGain && trail.elevationGain > 0 ? (
          <svg
            viewBox="0 0 100 30"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Simple elevation curve based on elevation gain */}
            <path
              d={`M 0,30 Q 25,${30 - (trail.elevationGain / 100)}, 50,${20 - (trail.elevationGain / 150)} T 100,${25 - (trail.elevationGain / 200)}`}
              fill="none"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            <path
              d={`M 0,30 Q 25,${30 - (trail.elevationGain / 100)}, 50,${20 - (trail.elevationGain / 150)} T 100,${25 - (trail.elevationGain / 200)} L 100,30 Z`}
              fill="rgba(100, 116, 139, 0.1)"
            />
          </svg>
        ) : (
          <span className="text-xs text-slate-400">Flat terrain</span>
        )}
        {trail.surface && (
          <div className="absolute bottom-1 right-1 text-xs text-slate-500 bg-white/80 px-1.5 py-0.5 rounded">
            {trail.surface}
          </div>
        )}
      </div>
    </button>
  );
}

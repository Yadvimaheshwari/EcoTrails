'use client';

import Link from 'next/link';
import { Heart, Clock, TrendingUp, Footprints } from 'lucide-react';
import { formatMiles, formatFeet, formatDuration } from '@/lib/formatting';

interface Trail {
  id: string;
  name: string;
  difficulty?: string;
  distance?: number | null;
  elevationGain?: number | null;
  estimatedTime?: number | null;
  isSaved?: boolean;
}

interface ExploreNearbyTrailsProps {
  trails: Trail[];
  isLoading?: boolean;
}

const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  hard: 'bg-orange-100 text-orange-700 border-orange-200',
  expert: 'bg-red-100 text-red-700 border-red-200',
};

export function ExploreNearbyTrails({ trails, isLoading }: ExploreNearbyTrailsProps) {
  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Nearby trails</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border-2 border-slate-200 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-2/3 mb-3" />
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
              <div className="h-10 bg-slate-200 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!trails || trails.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Nearby trails</h2>
        <div className="bg-white rounded-2xl p-8 text-center border-2 border-slate-200">
          <div className="text-slate-400 mb-3">
            <Footprints className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-slate-600 mb-2 font-medium">No trails found nearby</p>
          <p className="text-sm text-slate-500 mb-4">
            Try searching for a specific park or allow location access
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-slate-800 mb-4">Nearby trails</h2>
      <div className="space-y-3">
        {trails.map((trail) => {
          const difficultyColor =
            DIFFICULTY_COLORS[(trail.difficulty?.toLowerCase() as keyof typeof DIFFICULTY_COLORS)] ||
            DIFFICULTY_COLORS.moderate;

          return (
            <div
              key={trail.id}
              className="bg-white rounded-2xl p-5 border-2 border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-slate-800 mb-1.5 group-hover:text-emerald-700 transition-colors">
                    {trail.name || 'Unnamed Trail'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${difficultyColor}`}>
                      {trail.difficulty || 'Moderate'}
                    </span>
                  </div>
                </div>
                {trail.isSaved && (
                  <button
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Saved trail"
                  >
                    <Heart className="w-5 h-5 fill-current" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Footprints className="w-4 h-4 text-slate-400" />
                  <span>{formatMiles(trail.distance)} mi</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <span>{formatFeet(trail.elevationGain)} ft</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{formatDuration(trail.estimatedTime)}</span>
                </div>
              </div>

              <Link
                href={`/hikes/new?trailId=${trail.id}`}
                className="block w-full py-3 px-4 bg-emerald-600 text-white text-center font-semibold rounded-xl hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Start hike
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

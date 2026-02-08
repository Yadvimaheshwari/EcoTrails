'use client';

import Link from 'next/link';
import { Play, Eye, Check } from 'lucide-react';

interface ActiveHike {
  id: string;
  trailName: string;
  parkName?: string;
  elapsedTime?: string;
}

interface RecentTrail {
  id: string;
  name: string;
  parkName?: string;
}

interface RecentHike {
  id: string;
  trailName: string;
  parkName?: string;
  date?: string;
  distance?: number;
}

interface ExploreContinueProps {
  activeHike?: ActiveHike | null;
  recentlyViewed?: RecentTrail[];
  recentlyCompleted?: RecentHike[];
}

export function ExploreContinue({
  activeHike,
  recentlyViewed = [],
  recentlyCompleted = [],
}: ExploreContinueProps) {
  const hasContent = activeHike || recentlyViewed.length > 0 || recentlyCompleted.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium text-slate-800 mb-3">Continue exploring</h2>
      <div className="space-y-2">
        {/* Active Hike */}
        {activeHike && (
          <Link
            href={`/hikes/${activeHike.id}/live`}
            className="flex items-center gap-3 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-100 transition-all group"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center group-hover:bg-emerald-700 transition-colors">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-900 truncate">
                Resume last hike
              </p>
              <p className="text-xs text-emerald-700">
                {activeHike.trailName}
                {activeHike.elapsedTime && ` · ${activeHike.elapsedTime}`}
              </p>
            </div>
          </Link>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 px-2">Recently viewed</p>
            {recentlyViewed.slice(0, 3).map((trail) => (
              <Link
                key={trail.id}
                href={`/trails/${trail.id}`}
                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all group"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                  <Eye className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {trail.name}
                  </p>
                  {trail.parkName && (
                    <p className="text-xs text-slate-500 truncate">
                      {trail.parkName}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Recently Completed */}
        {recentlyCompleted.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 px-2">Recently completed</p>
            {recentlyCompleted.slice(0, 2).map((hike) => (
              <Link
                key={hike.id}
                href={`/journal/hikes/${hike.id}`}
                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all group"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Check className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {hike.trailName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {hike.date && new Date(hike.date).toLocaleDateString()}
                    {hike.distance && ` · ${hike.distance.toFixed(1)} mi`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

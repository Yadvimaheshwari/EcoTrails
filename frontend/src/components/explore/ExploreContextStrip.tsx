'use client';

import { Cloud, AlertTriangle, MapPin } from 'lucide-react';

interface ExploreContextStripProps {
  weather?: {
    temperature?: number;
    condition?: string;
  } | null;
  alertsCount?: number;
  nearbyCount?: number;
  radiusMiles?: number;
}

export function ExploreContextStrip({
  weather,
  alertsCount = 0,
  nearbyCount = 0,
  radiusMiles = 30,
}: ExploreContextStripProps) {
  const hasData = weather || alertsCount > 0 || nearbyCount > 0;

  if (!hasData) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {/* Weather */}
          {weather && (
            <button className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 transition-colors">
              <Cloud className="w-4 h-4 text-slate-400" />
              <span className="font-medium">{weather.temperature}°F</span>
              <span className="text-slate-500">{weather.condition}</span>
            </button>
          )}

          {/* Divider */}
          {weather && (alertsCount > 0 || nearbyCount > 0) && (
            <div className="hidden sm:block w-px h-4 bg-slate-200" />
          )}

          {/* Alerts */}
          {alertsCount > 0 && (
            <button className="flex items-center gap-2 text-amber-700 hover:text-amber-800 transition-colors">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">
                {alertsCount} alert{alertsCount !== 1 ? 's' : ''} nearby
              </span>
            </button>
          )}

          {/* Divider */}
          {(weather || alertsCount > 0) && nearbyCount > 0 && (
            <div className="hidden sm:block w-px h-4 bg-slate-200" />
          )}

          {/* Nearby count */}
          {nearbyCount > 0 && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>
                <span className="font-medium">{nearbyCount}</span> trails within{' '}
                <span className="font-medium">{radiusMiles} miles</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

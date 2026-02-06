'use client';

import { useRouter } from 'next/navigation';
import { ActiveHikeContext } from '@/lib/journal/types';

interface ActiveHikeBannerProps {
  hike: ActiveHikeContext;
  onEndHike?: () => void;
}

export function ActiveHikeBanner({ hike, onEndHike }: ActiveHikeBannerProps) {
  const router = useRouter();
  
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="mb-6 p-4 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4" 
         style={{ backgroundColor: '#FFF8F0', border: '2px solid #F4A340' }}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" 
             style={{ backgroundColor: '#F4A340' }}>
          <span className="text-2xl">🥾</span>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900">{hike.trailName}</h3>
            {hike.isOffline && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" 
                    style={{ backgroundColor: '#4F8A6B20', color: '#4F8A6B' }}>
                Offline
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>⏱️ {formatElapsedTime(hike.elapsedTime)}</span>
            <span>📍 GPS: {hike.gpsStatus}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => router.push(`/hikes/${hike.hikeId}`)}
          className="px-6 py-2 rounded-xl font-medium text-white transition-all hover:scale-105"
          style={{ backgroundColor: '#4F8A6B' }}>
          Resume Hike
        </button>
        {onEndHike && (
          <button
            onClick={onEndHike}
            className="px-4 py-2 rounded-xl font-medium transition-all hover:bg-gray-100"
            style={{ border: '1px solid #E8E8E3', color: '#6B7280' }}>
            End
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

/**
 * HikeHUD - Bottom HUD for Hike Mode
 * Shows stats and action buttons
 */

import React from 'react';

interface HikeHUDProps {
  elapsedSeconds: number;
  distanceMeters: number;
  elevationGainMeters: number;
  paceMinPerKm: number | null;
  isPaused: boolean;
  onPause: () => void;
  onDiscover: () => void;
  onStop: () => void;
}

export function HikeHUD({
  elapsedSeconds,
  distanceMeters,
  elevationGainMeters,
  paceMinPerKm,
  isPaused,
  onPause,
  onDiscover,
  onStop,
}: HikeHUDProps) {
  // Format time as HH:MM:SS or MM:SS
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format distance
  const formatDistance = (meters: number): string => {
    const miles = meters / 1609.344;
    if (miles < 0.1) return `${Math.round(meters)} m`;
    return `${miles.toFixed(2)} mi`;
  };

  // Format elevation
  const formatElevation = (meters: number): string => {
    const feet = meters * 3.28084;
    return `${Math.round(feet)} ft`;
  };

  // Format pace
  const formatPace = (minPerKm: number | null): string => {
    if (!minPerKm || !isFinite(minPerKm)) return '--:--';
    const minPerMile = minPerKm * 1.60934;
    const mins = Math.floor(minPerMile);
    const secs = Math.round((minPerMile - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 pb-safe pointer-events-none" style={{ zIndex: 100 }}>
      {/* Stats Bar */}
      <div className="mx-4 mb-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-4 pointer-events-auto">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="font-display text-2xl text-pineGreen">
              {formatTime(elapsedSeconds)}
            </div>
            <div className="text-xs text-textSecondary">Time</div>
          </div>
          <div>
            <div className="font-display text-2xl text-pineGreen">
              {formatDistance(distanceMeters)}
            </div>
            <div className="text-xs text-textSecondary">Distance</div>
          </div>
          <div>
            <div className="font-display text-2xl text-pineGreen">
              {formatElevation(elevationGainMeters)}
            </div>
            <div className="text-xs text-textSecondary">Elevation</div>
          </div>
          <div>
            <div className="font-display text-2xl text-pineGreen">
              {formatPace(paceMinPerKm)}
            </div>
            <div className="text-xs text-textSecondary">Pace</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mx-4 mb-4 flex gap-3 pointer-events-auto">
        {/* Pause Button */}
        <button
          onClick={onPause}
          className={`flex-1 py-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all ${
            isPaused
              ? 'bg-mossGreen text-white'
              : 'bg-white/95 backdrop-blur-md text-pineGreen shadow-lg'
          }`}
        >
          <span className="text-xl">{isPaused ? '▶️' : '⏸️'}</span>
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        {/* Discover Button - Primary CTA */}
        <button
          onClick={onDiscover}
          className="flex-[2] py-4 bg-discoveryGold text-white rounded-2xl font-medium flex items-center justify-center gap-2 shadow-lg hover:bg-discoveryGold/90 transition-colors"
        >
          <span className="text-xl">📸</span>
          <span>Discover</span>
        </button>

        {/* Stop Button */}
        <button
          onClick={onStop}
          className="flex-1 py-4 bg-white/95 backdrop-blur-md text-error rounded-2xl font-medium flex items-center justify-center gap-2 shadow-lg hover:bg-white transition-colors"
        >
          <span className="text-xl">⏹️</span>
          <span>Stop</span>
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

export interface TrailFilterState {
  difficulty: string[];
  distanceRange: [number, number];
  elevationRange: [number, number];
  loopType: string[];
  timeRange: [number, number];
}

interface TrailFiltersProps {
  filters: TrailFilterState;
  onChange: (filters: TrailFilterState) => void;
  trailCount: number;
}

export function TrailFilters({ filters, onChange, trailCount }: TrailFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleDifficulty = (difficulty: string) => {
    const newDifficulties = filters.difficulty.includes(difficulty)
      ? filters.difficulty.filter(d => d !== difficulty)
      : [...filters.difficulty, difficulty];
    onChange({ ...filters, difficulty: newDifficulties });
  };

  const toggleLoopType = (type: string) => {
    const newTypes = filters.loopType.includes(type)
      ? filters.loopType.filter(t => t !== type)
      : [...filters.loopType, type];
    onChange({ ...filters, loopType: newTypes });
  };

  const hasActiveFilters = 
    filters.difficulty.length > 0 || 
    filters.loopType.length > 0 ||
    filters.distanceRange[0] > 0 ||
    filters.distanceRange[1] < 50 ||
    filters.elevationRange[0] > 0 ||
    filters.elevationRange[1] < 5000;

  const clearFilters = () => {
    onChange({
      difficulty: [],
      distanceRange: [0, 50],
      elevationRange: [0, 5000],
      loopType: [],
      timeRange: [0, 8],
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 sticky top-20 z-10">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-slate-600" />
          <span className="font-semibold text-slate-800">Filters</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">{trailCount} trails</span>
          {hasActiveFilters && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFilters();
              }}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </button>

      {/* Filter Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          {/* Difficulty */}
          <div className="py-3 border-b border-slate-100">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Difficulty</label>
            <div className="flex flex-wrap gap-2">
              {['Easy', 'Moderate', 'Hard', 'Expert'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => toggleDifficulty(diff.toLowerCase())}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.difficulty.includes(diff.toLowerCase())
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Distance Range */}
          <div className="py-3 border-b border-slate-100">
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Distance: {filters.distanceRange[0]} - {filters.distanceRange[1]} miles
            </label>
            <div className="flex gap-3">
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={filters.distanceRange[0]}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    distanceRange: [parseFloat(e.target.value), filters.distanceRange[1]],
                  })
                }
                className="flex-1 accent-orange-600"
              />
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={filters.distanceRange[1]}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    distanceRange: [filters.distanceRange[0], parseFloat(e.target.value)],
                  })
                }
                className="flex-1 accent-orange-600"
              />
            </div>
          </div>

          {/* Elevation Range */}
          <div className="py-3 border-b border-slate-100">
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Elevation Gain: {filters.elevationRange[0].toLocaleString()} - {filters.elevationRange[1].toLocaleString()} ft
            </label>
            <div className="flex gap-3">
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={filters.elevationRange[0]}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    elevationRange: [parseInt(e.target.value), filters.elevationRange[1]],
                  })
                }
                className="flex-1 accent-orange-600"
              />
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={filters.elevationRange[1]}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    elevationRange: [filters.elevationRange[0], parseInt(e.target.value)],
                  })
                }
                className="flex-1 accent-orange-600"
              />
            </div>
          </div>

          {/* Loop Type */}
          <div className="py-3">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Trail Type</label>
            <div className="flex flex-wrap gap-2">
              {['Loop', 'Out & Back', 'Point to Point'].map((type) => (
                <button
                  key={type}
                  onClick={() => toggleLoopType(type.toLowerCase().replace(/\s+/g, '_'))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.loopType.includes(type.toLowerCase().replace(/\s+/g, '_'))
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

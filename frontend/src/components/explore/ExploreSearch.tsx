'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin, TrendingUp, Loader2, AlertCircle } from 'lucide-react';

interface ExploreSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  onClear: () => void;
  onLocationRequest: () => void;
  isLoading?: boolean;
  requestingLocation?: boolean;
  locationError?: string | null;
  typeaheadResults?: any[];
  onTypeaheadSelect?: (item: any) => void;
}

export function ExploreSearch({
  query,
  onQueryChange,
  onSearch,
  onClear,
  onLocationRequest,
  isLoading,
  requestingLocation,
  locationError,
  typeaheadResults = [],
  onTypeaheadSelect,
}: ExploreSearchProps) {
  const [showTypeahead, setShowTypeahead] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowTypeahead(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setShowTypeahead(typeaheadResults.length > 0 && query.length > 0);
  }, [typeaheadResults, query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowTypeahead(false);
    onSearch(query);
  };

  return (
    <div ref={containerRef} className="relative mb-6">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => {
              if (typeaheadResults.length > 0) {
                setShowTypeahead(true);
              }
            }}
            placeholder="Search parks, trails, regions…"
            className="w-full pl-12 pr-12 py-4 sm:py-5 text-base sm:text-lg bg-white border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>
      </form>

      {/* Secondary Actions */}
      <div className="space-y-3 mt-3">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onLocationRequest}
            disabled={requestingLocation}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requestingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
            {requestingLocation ? 'Locating...' : 'Use my location'}
          </button>
          <button
            onClick={() => {
              onQueryChange('national park');
              onSearch('national park');
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Popular parks
          </button>
        </div>
        
        {/* Location Error Message */}
        {locationError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Location Error</p>
              <p className="text-red-700 mt-0.5">{locationError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Typeahead Dropdown */}
      {showTypeahead && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-80 overflow-y-auto">
          {typeaheadResults.map((item: any, index) => {
            const id = item.id || item.place_id || item.google_place_id || index;
            return (
              <button
                key={id}
                onClick={() => {
                  setShowTypeahead(false);
                  onTypeaheadSelect?.(item);
                }}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 focus:outline-none focus:bg-slate-50"
              >
                <div className="font-medium text-slate-800">{item.name}</div>
                <div className="text-sm text-slate-500">{item.place_type || item.type || 'Park'}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

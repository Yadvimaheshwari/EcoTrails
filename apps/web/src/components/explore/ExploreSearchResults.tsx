'use client';

import Link from 'next/link';
import { X, MapPin, Search } from 'lucide-react';

interface SearchResult {
  id?: string;
  place_id?: string;
  google_place_id?: string;
  name: string;
  type?: string;
  place_type?: string;
  description?: string;
  location?: { lat: number; lng: number } | string;
}

interface ExploreSearchResultsProps {
  results: SearchResult[];
  onClear: () => void;
}

// Validate and extract place ID - CRITICAL for preventing /places/undefined
function getPlaceId(place: SearchResult): string | null {
  const placeId = place.id || place.place_id || place.google_place_id;
  
  // Validate placeId exists and is not "undefined" string
  if (!placeId || placeId === 'undefined' || placeId === 'null' || placeId.trim() === '') {
    console.warn('[ExploreSearchResults] Invalid place ID detected:', {
      name: place.name,
      id: place.id,
      place_id: place.place_id,
      google_place_id: place.google_place_id,
    });
    return null;
  }
  
  return placeId;
}

export function ExploreSearchResults({ results, onClear }: ExploreSearchResultsProps) {
  // Filter out results with invalid IDs - CRITICAL
  const validResults = results.filter((result) => getPlaceId(result) !== null);
  
  const invalidCount = results.length - validResults.length;
  if (invalidCount > 0) {
    console.log(`[ExploreSearchResults] Filtered out ${invalidCount} invalid results`);
  }
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-800">
          Search results {validResults.length > 0 && `(${validResults.length})`}
        </h2>
        <button
          onClick={onClear}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <X className="w-4 h-4" />
          Clear results
        </button>
      </div>

      {validResults.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border-2 border-slate-200">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 mb-2 font-medium">No parks found</p>
          <p className="text-sm text-slate-500 mb-4">
            Try searching for "national park" or "state park"
          </p>
          <button
            onClick={onClear}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
          >
            Back to explore
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {validResults.map((result) => {
            const placeId = getPlaceId(result)!; // Safe because we filtered
            return (
              <Link
                key={placeId}
                href={`/places/${placeId}`}
                className="block bg-white rounded-2xl p-5 border-2 border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all group"
              >
                <h3 className="text-lg font-semibold text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">
                  {result.name}
                </h3>
                {(result.type || result.place_type) && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="capitalize">{result.type || result.place_type}</span>
                  </div>
                )}
                {result.description && (
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {result.description}
                  </p>
                )}
                <div className="mt-3 text-sm font-medium text-emerald-600 group-hover:text-emerald-700">
                  View trails →
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

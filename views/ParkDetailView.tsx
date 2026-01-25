/**
 * Park Detail View
 * Shows comprehensive park information and trail list
 * Matches mobile app's ParkDetailScreen functionality
 */
import React, { useState, useEffect } from 'react';
import { Park, US_PARKS, getParksByState } from '../data/parks';

interface ParkDetailViewProps {
  parkId: string;
  onTrailSelect?: (trailId: string) => void;
  onBack?: () => void;
}

// Mock trail data generator (matches mobile app's ApiService)
const generateMockTrails = (parkId: string, parkName: string) => {
  const difficulties = ['easy', 'moderate', 'hard', 'expert'];
  const routeTypes = ['out-and-back', 'loop', 'point-to-point'];
  const trailNames = [
    `${parkName} Main Trail`,
    `${parkName} Summit Trail`,
    `${parkName} Loop Trail`,
    `${parkName} Waterfall Trail`,
    `${parkName} Scenic Overlook`,
  ];

  return trailNames.slice(0, 3 + Math.floor(Math.random() * 2)).map((name, index) => {
    const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    const length_miles = 2 + Math.random() * 10;
    const elevation_gain_ft = 200 + Math.random() * 3000;
    
    return {
      id: `trail-${parkId}-${index}`,
      park_id: parkId,
      name,
      description: `A beautiful trail in ${parkName} with scenic views and diverse terrain.`,
      difficulty,
      length_miles: Math.round(length_miles * 10) / 10,
      elevation_gain_ft: Math.round(elevation_gain_ft),
      estimated_duration_hours: Math.round((length_miles / 2.5) * 10) / 10,
      route_type: routeTypes[Math.floor(Math.random() * routeTypes.length)],
      rating: 4 + Math.random(),
      review_count: Math.floor(Math.random() * 100) + 10,
    };
  });
};

const ParkDetailView: React.FC<ParkDetailViewProps> = ({ parkId, onTrailSelect, onBack }) => {
  const [park, setPark] = useState<Park | null>(null);
  const [trails, setTrails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'popularity' | 'length' | 'rating'>('popularity');

  useEffect(() => {
    loadParkDetail();
  }, [parkId]);

  const loadParkDetail = () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!parkId) {
        throw new Error('Park ID is required');
      }
      
      // Find park in US_PARKS
      const parkData = US_PARKS.find(p => p.id === parkId);
      
      if (!parkData) {
        throw new Error('Park not found');
      }
      
      setPark(parkData);
      
      // Generate mock trails (matching mobile app behavior)
      const mockTrails = generateMockTrails(parkId, parkData.name);
      setTrails(mockTrails);
    } catch (err: any) {
      setError(err.message || 'Failed to load park details');
      console.error('Error loading park detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedTrails = React.useMemo(() => {
    let filtered = [...trails];

    // Filter by difficulty
    if (filterDifficulty) {
      filtered = filtered.filter(t => t.difficulty === filterDifficulty);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'length':
          return a.length_miles - b.length_miles;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'popularity':
        default:
          return (b.review_count || 0) - (a.review_count || 0);
      }
    });

    return filtered;
  }, [trails, filterDifficulty, sortBy]);

  const handleTrailPress = (trail: any) => {
    if (onTrailSelect) {
      onTrailSelect(trail.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#2D4739]/20 border-t-[#2D4739] rounded-full animate-spin mx-auto"></div>
          <p className="text-[#8E8B82]">Loading park details...</p>
        </div>
      </div>
    );
  }

  if (error || !park) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold text-[#2D4739]">Unable to load park</h2>
          <p className="text-[#8E8B82]">{error || 'Park not found'}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 bg-[#2D4739] text-white rounded-xl font-semibold hover:bg-[#1A2C23] transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7] pb-32">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8DE] px-6 pt-16 pb-6">
        <div className="max-w-4xl mx-auto">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 text-[#2D4739] hover:text-[#1A2C23] transition-colors"
            >
              ← Back
            </button>
          )}
          <h1 className="text-4xl font-bold text-[#2D4739] mb-2">{park.name}</h1>
          <p className="text-lg text-[#8E8B82]">{park.type}</p>
          <p className="text-sm text-[#8E8B82] mt-1">📍 {park.state}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Description */}
        {park.description && (
          <section>
            <h2 className="text-xl font-semibold text-[#2D4739] mb-4">About</h2>
            <p className="text-[#2D4739] leading-relaxed">{park.description}</p>
          </section>
        )}

        {/* Park Info */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {park.established && (
            <div className="bg-white p-4 rounded-xl border border-[#E2E8DE]">
              <p className="text-xs text-[#8E8B82] uppercase tracking-wide mb-1">Established</p>
              <p className="text-lg font-bold text-[#2D4739]">{park.established}</p>
            </div>
          )}
          {park.area && (
            <div className="bg-white p-4 rounded-xl border border-[#E2E8DE]">
              <p className="text-xs text-[#8E8B82] uppercase tracking-wide mb-1">Area</p>
              <p className="text-lg font-bold text-[#2D4739]">{park.area}</p>
            </div>
          )}
          {park.elevation && (
            <div className="bg-white p-4 rounded-xl border border-[#E2E8DE]">
              <p className="text-xs text-[#8E8B82] uppercase tracking-wide mb-1">Elevation</p>
              <p className="text-lg font-bold text-[#2D4739]">{park.elevation}</p>
            </div>
          )}
          {park.features && park.features.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-[#E2E8DE]">
              <p className="text-xs text-[#8E8B82] uppercase tracking-wide mb-1">Features</p>
              <p className="text-lg font-bold text-[#2D4739]">{park.features.length}</p>
            </div>
          )}
        </section>

        {/* Features */}
        {park.features && park.features.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-[#2D4739] mb-4">Features</h2>
            <div className="flex flex-wrap gap-2">
              {park.features.map((feature, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-[#E2E8DE] rounded-full text-sm text-[#2D4739] font-medium"
                >
                  {feature}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Weather Widget */}
        <WeatherWidget park={park} />

        {/* Safety/Alerts Placeholder */}
        <section>
          <h2 className="text-xl font-semibold text-[#2D4739] mb-4">Safety & Alerts</h2>
          <div className="bg-white p-6 rounded-xl border border-[#E2E8DE]">
            <p className="text-[#2D4739]">✅ No current alerts</p>
          </div>
        </section>

        {/* Trails Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#2D4739]">
              Trails ({filteredAndSortedTrails.length})
            </h2>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFilterDifficulty(null)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                !filterDifficulty
                  ? 'bg-[#2D4739] text-white'
                  : 'bg-white border border-[#E2E8DE] text-[#2D4739] hover:bg-[#F9F9F7]'
              }`}
            >
              All
            </button>
            {['easy', 'moderate', 'hard', 'expert'].map((diff) => (
              <button
                key={diff}
                onClick={() => setFilterDifficulty(diff)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                  filterDifficulty === diff
                    ? 'bg-[#2D4739] text-white'
                    : 'bg-white border border-[#E2E8DE] text-[#2D4739] hover:bg-[#F9F9F7]'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-[#8E8B82]">Sort:</span>
            {(['popularity', 'length', 'rating'] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                  sortBy === sort
                    ? 'bg-[#2D4739] text-white'
                    : 'bg-white border border-[#E2E8DE] text-[#2D4739] hover:bg-[#F9F9F7]'
                }`}
              >
                {sort}
              </button>
            ))}
          </div>

          {/* Trail List */}
          {filteredAndSortedTrails.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-[#E2E8DE] text-center">
              <p className="text-[#8E8B82]">No trails found. Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedTrails.map((trail) => (
                <button
                  key={trail.id}
                  onClick={() => handleTrailPress(trail)}
                  className="w-full bg-white p-6 rounded-xl border border-[#E2E8DE] hover:border-[#2D4739] transition-all text-left group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#2D4739] mb-1 group-hover:text-[#1A2C23]">
                        {trail.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-[#8E8B82]">
                        <span className="capitalize">{trail.difficulty}</span>
                        <span>•</span>
                        <span>{trail.length_miles.toFixed(1)} mi</span>
                        <span>•</span>
                        <span>{trail.elevation_gain_ft} ft gain</span>
                        <span>•</span>
                        <span>~{trail.estimated_duration_hours.toFixed(1)} hrs</span>
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-lg text-xs font-bold text-white ${
                        trail.difficulty === 'easy'
                          ? 'bg-green-500'
                          : trail.difficulty === 'moderate'
                          ? 'bg-orange-500'
                          : trail.difficulty === 'hard'
                          ? 'bg-red-500'
                          : 'bg-purple-500'
                      }`}
                    >
                      {trail.difficulty.toUpperCase()}
                    </div>
                  </div>
                  {trail.description && (
                    <p className="text-sm text-[#8E8B82] line-clamp-2 mb-2">{trail.description}</p>
                  )}
                  {trail.rating && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#2D4739]">⭐ {trail.rating.toFixed(1)}</span>
                      {trail.review_count && (
                        <span className="text-[#8E8B82]">({trail.review_count} reviews)</span>
                      )}
                    </div>
                  )}
                  <div className="mt-3 text-[#2D4739] opacity-0 group-hover:opacity-100 transition-opacity">
                    View Trail →
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ParkDetailView;

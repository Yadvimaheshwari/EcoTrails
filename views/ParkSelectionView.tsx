
import React, { useState, useMemo } from 'react';
import { getParkBriefing } from '../geminiService';
import { TrailBriefing } from '../types';
import { US_PARKS, Park, searchParks, getAllStates, getParksByType } from '../data/parks';

interface ParkSelectionViewProps {
  onBriefingReady: (briefing: TrailBriefing) => void;
}

const ParkSelectionView: React.FC<ParkSelectionViewProps> = ({ onBriefingReady }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<Park['type'] | null>(null);

  // Filter parks based on search, state, and type
  const filteredParks = useMemo(() => {
    let parks = US_PARKS;

    // Apply search filter
    if (searchQuery.trim()) {
      parks = searchParks(searchQuery);
    }

    // Apply state filter
    if (selectedState) {
      parks = parks.filter(park =>
        park.state === selectedState || (park.states && park.states.includes(selectedState))
      );
    }

    // Apply type filter
    if (selectedType) {
      parks = parks.filter(park => park.type === selectedType);
    }

    return parks;
  }, [searchQuery, selectedState, selectedType]);

  const handleSelect = async (park: Park) => {
    setLoading(park.id);
    try {
      const briefing = await getParkBriefing(park.name);
      onBriefingReady(briefing);
    } catch (err) {
      console.error(err);
      setLoading(null);
    }
  };

  const formatCoords = (park: Park) => {
    const lat = park.coordinates.lat >= 0 
      ? `${park.coordinates.lat.toFixed(1)}° N` 
      : `${Math.abs(park.coordinates.lat).toFixed(1)}° S`;
    const lng = park.coordinates.lng >= 0 
      ? `${park.coordinates.lng.toFixed(1)}° E` 
      : `${Math.abs(park.coordinates.lng).toFixed(1)}° W`;
    return `${lat}, ${lng}`;
  };

  const states = getAllStates();
  const parkTypes: Park['type'][] = ['National Park', 'National Forest', 'State Park', 'National Monument', 'National Recreation Area', 'Wilderness Area'];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-12 animate-in fade-in duration-1000">
      <header className="text-center space-y-3">
        <h1 className="text-display text-[#2D4739]">Finding a path</h1>
        <p className="text-body text-[#8E8B82]">Choose a landscape to begin the shared observation.</p>
        <p className="text-sm text-[#8E8B82]">{filteredParks.length} parks available</p>
      </header>

      {/* Search and Filters */}
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Search parks, states, or features..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border border-[#E2E8DE] bg-white focus:outline-none focus:border-[#2D4739] text-[#2D4739] placeholder-[#8E8B82]"
        />
        
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedState || ''}
            onChange={(e) => setSelectedState(e.target.value || null)}
            className="px-4 py-2 rounded-xl border border-[#E2E8DE] bg-white text-[#2D4739] focus:outline-none focus:border-[#2D4739]"
          >
            <option value="">All States</option>
            {states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          
          <select
            value={selectedType || ''}
            onChange={(e) => setSelectedType(e.target.value as Park['type'] || null)}
            className="px-4 py-2 rounded-xl border border-[#E2E8DE] bg-white text-[#2D4739] focus:outline-none focus:border-[#2D4739]"
          >
            <option value="">All Types</option>
            {parkTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          
          {(searchQuery || selectedState || selectedType) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedState(null);
                setSelectedType(null);
              }}
              className="px-4 py-2 rounded-xl border border-[#E2E8DE] bg-[#F9F9F7] text-[#2D4739] hover:bg-[#E2E8DE] transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Parks List */}
      <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto">
        {filteredParks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#8E8B82]">No parks found. Try adjusting your search or filters.</p>
          </div>
        ) : (
          filteredParks.map((park) => (
            <button 
              key={park.id}
              disabled={!!loading}
              onClick={() => handleSelect(park)}
              className="soft-card p-6 flex items-center space-x-6 hover:border-[#2D4739] transition-all group relative overflow-hidden text-left"
            >
              {loading === park.id && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20 space-x-3">
                  <div className="w-5 h-5 border-2 border-[#2D4739]/10 border-t-[#2D4739] rounded-full animate-spin"></div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#2D4739]">Gathering information about this place</span>
                </div>
              )}
              <div className="w-16 h-16 rounded-2xl bg-[#F9F9F7] flex items-center justify-center text-3xl group-hover:scale-110 transition-transform flex-shrink-0">
                {park.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-h2 text-[#2D4739] truncate">{park.name}</h3>
                <p className="text-caption text-[#8E8B82]">{park.type} • {park.state}</p>
                <p className="text-xs text-[#8E8B82] mt-1">{formatCoords(park)}</p>
                {park.features && park.features.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {park.features.slice(0, 3).map((feature, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 bg-[#E2E8DE] rounded-full text-[#2D4739]">
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-[#2D4739] opacity-20 group-hover:opacity-100 transition-opacity flex-shrink-0">→</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default ParkSelectionView;

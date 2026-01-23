
import React, { useState } from 'react';
import { getParkBriefing } from '../geminiService';
import { TrailBriefing } from '../types';

interface ParkSelectionViewProps {
  onBriefingReady: (briefing: TrailBriefing) => void;
}

const PARKS = [
  { name: "Sarek National Park", icon: "🏔️", coords: "67.3° N, 17.6° E" },
  { name: "Yosemite Valley", icon: "🌲", coords: "37.8° N, 119.5° W" },
  { name: "Lake District Peaks", icon: "⛰️", coords: "54.4° N, 3.1° W" },
  { name: "Blue Ridge Parkway", icon: "🌿", coords: "35.5° N, 82.5° W" }
];

const ParkSelectionView: React.FC<ParkSelectionViewProps> = ({ onBriefingReady }) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (park: string) => {
    setLoading(park);
    try {
      const briefing = await getParkBriefing(park);
      onBriefingReady(briefing);
    } catch (err) {
      console.error(err);
      setLoading(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-12 py-12 animate-in fade-in duration-1000">
      <header className="text-center space-y-3">
        <h1 className="text-display text-[#2D4739]">Finding a path</h1>
        <p className="text-body text-[#8E8B82]">Choose a landscape to begin the shared observation.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {PARKS.map((park) => (
          <button 
            key={park.name}
            disabled={!!loading}
            onClick={() => handleSelect(park.name)}
            className="soft-card p-6 flex items-center space-x-6 hover:border-[#2D4739] transition-all group relative overflow-hidden"
          >
            {loading === park.name && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20 space-x-3">
                <div className="w-5 h-5 border-2 border-[#2D4739]/10 border-t-[#2D4739] rounded-full animate-spin"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#2D4739]">Gathering information about this place</span>
              </div>
            )}
            <div className="w-16 h-16 rounded-2xl bg-[#F9F9F7] flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
              {park.icon}
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-h2 text-[#2D4739]">{park.name}</h3>
              <p className="text-caption">{park.coords}</p>
            </div>
            <div className="text-[#2D4739] opacity-20 group-hover:opacity-100 transition-opacity">→</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ParkSelectionView;

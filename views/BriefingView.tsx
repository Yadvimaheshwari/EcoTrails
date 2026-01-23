
import React from 'react';
import { TrailBriefing } from '../types';

interface BriefingViewProps {
  briefing: TrailBriefing;
  onStart: () => void;
}

const BriefingView: React.FC<BriefingViewProps> = ({ briefing, onStart }) => {
  return (
    <div className="max-w-xl mx-auto space-y-12 py-16 animate-in slide-in-from-right duration-700 pb-40">
      <header className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#8E8B82]">A sense of the land</p>
        <h2 className="text-display text-[#2D4739]">{briefing.park_name}</h2>
        <div className="w-16 h-0.5 bg-[#2D4739]/10"></div>
      </header>

      <section className="space-y-6">
        <div className="prose prose-stone">
           <p className="text-lg text-[#2D4739] leading-relaxed font-medium">
             {briefing.location_summary}
           </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="soft-card p-6 bg-white border-[#E2E8DE]/50">
          <p className="text-[10px] font-bold text-[#8E8B82] uppercase tracking-widest mb-1">Expected effort</p>
          <p className="text-h2 text-[#2D4739]">{briefing.difficulty}</p>
        </div>
        <div className="soft-card p-6 bg-white border-[#E2E8DE]/50">
          <p className="text-[10px] font-bold text-[#8E8B82] uppercase tracking-widest mb-1">Total height</p>
          <p className="text-h2 text-[#2D4739]">{briefing.elevation_gain}</p>
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-caption uppercase tracking-[0.2em]">Characteristics of the path</h3>
        <div className="grid grid-cols-1 gap-3">
          {briefing.terrain_profile.map((type, i) => (
            <div key={i} className="flex items-center space-x-3 px-4 py-3 bg-white border border-[#E2E8DE]/30 rounded-2xl">
               <span className="w-1.5 h-1.5 bg-[#2D4739] rounded-full"></span>
               <span className="text-sm text-[#4A443F] font-medium">{type}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="soft-card p-8 bg-white border-none shadow-xl shadow-[#2D4739]/5 space-y-4">
        <h3 className="text-h2 text-[#2D4739]">Current state</h3>
        <p className="text-body text-[#4A443F] leading-relaxed italic opacity-90">
          {briefing.environmental_baseline}
        </p>
      </section>

      {briefing.recent_alerts.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-caption uppercase tracking-[0.2em]">Things to notice</h3>
          <div className="space-y-3">
            {briefing.recent_alerts.map((alert, i) => (
              <div key={i} className="bg-stone-100/50 border border-stone-200 p-4 rounded-2xl text-xs text-[#4A443F] flex items-start space-x-3">
                <span className="text-[#2D4739] font-bold mt-0.5 opacity-40">●</span>
                <span className="leading-relaxed">{alert}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {briefing.sources.length > 0 && (
        <section className="space-y-3">
          <p className="text-[10px] font-bold text-[#8E8B82] uppercase tracking-widest">Shared knowledge</p>
          <div className="flex flex-wrap gap-2">
            {briefing.sources.map((chunk: any, i: number) => {
              const source = chunk.web || chunk.maps;
              if (!source?.uri) return null;
              return (
                <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold px-3 py-1.5 bg-white border border-[#E2E8DE] rounded-full text-[#2D4739] hover:bg-[#2D4739] hover:text-white transition-all">
                  {source.title || 'View details'}
                </a>
              );
            })}
          </div>
        </section>
      )}

      <div className="pt-8">
        <button onClick={onStart} className="w-full py-5 bg-[#2D4739] text-white rounded-[24px] text-h2 font-bold shadow-2xl hover:bg-[#1A2C23] transition-all transform active:scale-[0.98]">
          The journey is ready
        </button>
      </div>
    </div>
  );
};

export default BriefingView;

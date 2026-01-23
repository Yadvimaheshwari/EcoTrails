
import React, { useState, useEffect } from 'react';
import { EnvironmentalRecord, ConfidenceLevel } from '../types';

interface ReportViewProps {
  record: EnvironmentalRecord;
  onBack: () => void;
}

const ConfidenceBadge: React.FC<{ level: ConfidenceLevel }> = ({ level }) => {
  const colors = {
    High: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Medium: 'bg-amber-100 text-amber-800 border-amber-200',
    Low: 'bg-orange-100 text-orange-800 border-orange-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${colors[level]}`}>
      {level} certainty
    </span>
  );
};

const ReportView: React.FC<ReportViewProps> = ({ record, onBack }) => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      setScrollProgress(scrolled);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F9F9F7] animate-in slide-in-from-right duration-700">
      <div className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center pointer-events-none">
        <button 
          onClick={onBack}
          className="pointer-events-auto w-10 h-10 rounded-full bg-white border border-[#E2E8DE] flex items-center justify-center shadow-sm"
        >
          <svg className="w-5 h-5 text-[#2D4739]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
      <div className="fixed top-0 left-0 h-1 bg-emerald-500 z-[60]" style={{ width: `${scrollProgress}%` }}></div>

      <div className="max-w-xl mx-auto space-y-12 pb-32">
        <section className="relative h-[80vh] flex flex-col justify-end p-8 overflow-hidden">
          <img src={record.multimodalEvidence[0] || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b'} className="absolute inset-0 w-full h-full object-cover" alt="Hero" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2D4739]/90 via-[#2D4739]/20"></div>
          <div className="relative z-10 space-y-4 text-white">
            <p className="text-caption text-white/70 uppercase tracking-widest">{record.park_name}</p>
            <h1 className="text-display leading-none">A memory of the trail</h1>
            <p className="text-body italic text-white/80">"{new Date(record.timestamp).toDateString()}"</p>
          </div>
        </section>

        {record.visual_artifact && (
          <section className="px-6 space-y-4">
             <h3 className="text-caption uppercase tracking-widest px-1">A sketch of the land</h3>
             <div className="soft-card overflow-hidden">
                <img src={record.visual_artifact} className="w-full h-auto" alt="Field Sketch" />
             </div>
          </section>
        )}

        {record.field_narrative && (
          <section className="px-6 space-y-4">
            <h3 className="text-caption uppercase tracking-widest px-1">A story of the walk</h3>
            <div className="soft-card p-10 bg-white space-y-8 border-[#E2E8DE] border-2">
                <div className="space-y-2">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D4739]/40">Consistency</p>
                   <p className="font-serif italic text-lg leading-relaxed text-[#2D4739]/90">"{record.field_narrative.consistent}"</p>
                </div>
                <div className="space-y-2">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D4739]/40">Changes noticed</p>
                   <p className="font-serif italic text-lg leading-relaxed text-[#2D4739]/90">"{record.field_narrative.different}"</p>
                </div>
                <div className="space-y-2">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D4739]/40">Evolution</p>
                   <p className="font-serif italic text-lg leading-relaxed text-[#2D4739]/90">"{record.field_narrative.changing}"</p>
                </div>
                <div className="pt-6 border-t border-emerald-800/5">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800/40 mb-3">Things left unknown</p>
                   <p className="text-sm font-sans font-medium text-[#4A443F]">"{record.field_narrative.uncertain}"</p>
                </div>
            </div>
          </section>
        )}

        {record.temporal_delta && (
          <section className="px-6 space-y-4">
            <h3 className="text-caption uppercase tracking-widest px-1">The Land's Memory</h3>
            <div className="soft-card p-8 bg-white border-[#E2E8DE] relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                  <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                  </svg>
               </div>
               <p className="text-[10px] font-bold uppercase text-[#2D4739]/60 tracking-widest mb-4">Historical Drift</p>
               <p className="text-body text-[#4A443F] leading-relaxed font-serif italic text-lg relative z-10">
                 "{record.temporal_delta}"
               </p>
               <div className="mt-6 pt-4 border-t border-[#F9F9F7]">
                  <p className="text-[10px] text-[#8E8B82] italic">Atlas compares this path against your prior visit history and regional seasonal drift.</p>
               </div>
            </div>
          </section>
        )}

        {record.fusion_analysis && (
          <section className="px-6 space-y-4">
            <h3 className="text-caption uppercase tracking-widest px-1">Perspective Fusion</h3>
            <div className="soft-card p-8 bg-white border-[#E2E8DE] space-y-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                  <svg className="w-32 h-32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
               </div>

               <div className="space-y-4 relative z-10">
                 {record.fusion_analysis.consistent_observations.length > 0 && (
                   <div className="space-y-3">
                     <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest">Orbital & Ground Alignment</p>
                     <div className="space-y-2">
                       {record.fusion_analysis.consistent_observations.map((obs, i) => (
                         <div key={i} className="flex items-start space-x-3 text-sm text-[#4A443F] bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                           <span className="mt-1">🛰️</span>
                           <p>{obs}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {record.fusion_analysis.divergent_observations.length > 0 && (
                   <div className="space-y-3">
                     <p className="text-[10px] font-bold uppercase text-amber-600 tracking-widest">Perspective Divergence</p>
                     <div className="space-y-2">
                       {record.fusion_analysis.divergent_observations.map((obs, i) => (
                         <div key={i} className="flex items-start space-x-3 text-sm text-[#4A443F] bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                           <span className="mt-1">🔍</span>
                           <p>{obs}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
            </div>
          </section>
        )}

        {record.experience_synthesis && (
          <section className="px-6 space-y-4">
             <div className="flex justify-between items-end px-1">
                <h3 className="text-caption uppercase tracking-widest">Reasoning & Synthesis</h3>
                <ConfidenceBadge level={record.experience_synthesis.confidence} />
             </div>
             <div className="soft-card p-8 space-y-6 bg-white border-[#E2E8DE]">
                <h4 className="text-h2 text-[#2D4739]">{record.experience_synthesis.trail_difficulty_perception}</h4>
                <div className="grid grid-cols-1 gap-4">
                   {record.experience_synthesis.beginner_tips.map((tip, i) => (
                     <div key={i} className="flex items-start space-x-3">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-700 shrink-0">✓</span>
                        <p className="text-sm text-[#4A443F] leading-relaxed">{tip}</p>
                     </div>
                   ))}
                </div>
             </div>
          </section>
        )}

        <section className="px-6 mb-20">
          <button 
            onClick={onBack}
            className="w-full py-5 bg-[#2D4739] text-white rounded-2xl text-h2 font-bold shadow-xl"
          >
            The story continues later
          </button>
        </section>
      </div>
    </div>
  );
};

export default ReportView;

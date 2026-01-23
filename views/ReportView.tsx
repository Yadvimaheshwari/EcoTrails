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
      {level} Confidence
    </span>
  );
};

const UncertaintyNotice: React.FC<{ explanation: string, suggestion: string }> = ({ explanation, suggestion }) => (
  <div className="mt-4 p-4 bg-orange-50/30 rounded-xl border border-orange-100/50 space-y-2">
    <p className="text-[10px] text-orange-800 leading-relaxed font-medium">
      <span className="font-bold">Observation Note:</span> {explanation}
    </p>
    <p className="text-[10px] text-[#2D4739] italic opacity-60">
      <span className="font-bold">Improvement Tip:</span> {suggestion}
    </p>
  </div>
);

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
          <img src={record.multimodalEvidence[0]} className="absolute inset-0 w-full h-full object-cover" alt="Hero" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2D4739]/80 via-transparent"></div>
          <div className="relative z-10 space-y-4 text-white">
            <p className="text-caption text-white/70 uppercase tracking-widest">Moment of Arrival</p>
            <h1 className="text-display leading-none">{record.location.name}</h1>
            <p className="text-body italic text-white/80">"{record.summary}"</p>
          </div>
        </section>

        {record.field_narrative && (
          <section className="px-6 space-y-4">
            <h3 className="text-caption uppercase tracking-widest px-1">Bard's Field Note</h3>
            <div className="soft-card p-10 bg-white space-y-8 font-serif italic text-lg leading-relaxed text-[#2D4739]/90 border-[#E2E8DE] border-2">
                <p>"{record.field_narrative.overview}"</p>
                <p>"{record.field_narrative.revelations}"</p>
                <p>"{record.field_narrative.changes}"</p>
                <div className="pt-6 border-t border-emerald-800/5">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800/40 mb-3 font-sans not-italic">Look for this next time</p>
                   <p className="text-sm font-sans not-italic font-medium text-[#4A443F]">"{record.field_narrative.future_notes}"</p>
                </div>
            </div>
          </section>
        )}

        {record.experience_synthesis && (
          <section className="px-6 space-y-4">
             <div className="flex justify-between items-end px-1">
                <h3 className="text-caption uppercase tracking-widest">Trail Interface</h3>
                <ConfidenceBadge level={record.experience_synthesis.confidence} />
             </div>
             <div className="soft-card p-8 space-y-6 bg-white border-[#E2E8DE]">
                <div className="space-y-2">
                   <h4 className="text-h2 text-[#2D4739]">{record.experience_synthesis.trail_difficulty_perception}</h4>
                   <p className="text-body text-[#4A443F] opacity-70">Accessibility: {record.experience_synthesis.accessibility_notes}</p>
                </div>
                
                <div className="space-y-4 pt-4 border-t border-[#F9F9F7]">
                   <div className="flex flex-wrap gap-2">
                      {record.experience_synthesis.exposure_stress.factors.map(f => (
                        <span key={f} className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-orange-50 text-orange-600 rounded-full">
                          {f}
                        </span>
                      ))}
                   </div>
                   <div className="grid grid-cols-1 gap-4">
                      {record.experience_synthesis.beginner_tips.slice(0, 2).map((tip, i) => (
                        <div key={i} className="flex items-start space-x-3">
                           <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-700 shrink-0">✓</span>
                           <p className="text-sm text-[#4A443F] leading-relaxed">{tip}</p>
                        </div>
                      ))}
                   </div>
                </div>

                {record.experience_synthesis.confidence !== 'High' && (
                  <UncertaintyNotice 
                    explanation={record.experience_synthesis.uncertainty_explanation} 
                    suggestion={record.experience_synthesis.improvement_suggestion} 
                  />
                )}
             </div>
          </section>
        )}

        {record.acoustic_profile && (
          <section className="px-6 space-y-4">
            <div className="flex justify-between items-end px-1">
               <h3 className="text-caption uppercase tracking-widest">Soundscape Profile</h3>
               <ConfidenceBadge level={record.acoustic_profile.confidence} />
            </div>
            <div className="soft-card p-8 bg-[#2D4739] text-white border-none overflow-hidden relative">
              <div className="absolute inset-0 opacity-10">
                <div className="flex items-end justify-center h-full space-x-1 py-8">
                  {Array.from({length: 40}).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-white rounded-full animate-pulse" 
                      style={{ 
                        height: `${20 + Math.random() * 80}%`,
                        animationDelay: `${i * 0.05}s`,
                        animationDuration: `${0.5 + Math.random()}s`
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="relative z-10 space-y-6">
                 <p className="text-h2 italic font-light leading-relaxed">"{record.acoustic_profile.soundscape_summary}"</p>
                 <div className="grid grid-cols-2 gap-4">
                    {Object.entries(record.acoustic_profile.activity_levels).map(([k, v]) => (
                      <div key={k} className="bg-white/10 rounded-xl p-3 border border-white/5">
                        <p className="text-[8px] uppercase font-bold text-white/40 mb-1">{k}</p>
                        <p className="text-xs font-bold">{v}</p>
                      </div>
                    ))}
                 </div>
                 {record.acoustic_profile.confidence !== 'High' && (
                    <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 text-[9px] text-white/60 leading-relaxed italic">
                      <span className="font-bold uppercase text-white/40">Signal Clarity Note:</span> {record.acoustic_profile.uncertainty_explanation}
                    </div>
                 )}
              </div>
            </div>
          </section>
        )}

        <section className="px-6 mb-20">
          <button 
            onClick={onBack}
            className="w-full py-5 bg-[#2D4739] text-white rounded-2xl text-h2 font-bold shadow-xl"
          >
            Close Report
          </button>
        </section>
      </div>
    </div>
  );
};

export default ReportView;
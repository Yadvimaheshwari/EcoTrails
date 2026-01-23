
import React, { useState } from 'react';
import { mapGrounding, searchGrounding, generateVisualArtifact } from '../geminiService';
import { VisualArtifact } from '../types';

const ExplorationView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{text: string, sources: any[]} | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'maps' | 'search'>('maps');
  const [artifact, setArtifact] = useState<VisualArtifact | null>(null);
  const [generatingArtifact, setGeneratingArtifact] = useState(false);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    setArtifact(null);
    try {
      setResults(mode === 'maps' ? await mapGrounding(query) : await searchGrounding(query));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOverlay = async () => {
    if (!results) return;
    setGeneratingArtifact(true);
    try {
      const art = await generateVisualArtifact('map_overlay', results.text);
      setArtifact(art);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingArtifact(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-[#2D4739] font-['Instrument_Sans']">Spatial Grounding Exploration</h2>
        <p className="text-[#8E8B82] text-sm">Query landmarks or environmental signals using live data feeds.</p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="bg-[#E2E8DE]/40 p-1 rounded-xl flex">
          <button 
            onClick={() => setMode('maps')}
            className={`px-4 py-2 rounded-lg text-sm transition-all font-bold ${mode === 'maps' ? 'bg-[#2D4739] text-white shadow-lg' : 'text-[#8E8B82] hover:text-[#2D4739]'}`}
          >
            Maps
          </button>
          <button 
            onClick={() => setMode('search')}
            className={`px-4 py-2 rounded-lg text-sm transition-all font-bold ${mode === 'search' ? 'bg-[#2D4739] text-white shadow-lg' : 'text-[#8E8B82] hover:text-[#2D4739]'}`}
          >
            Search
          </button>
        </div>
      </div>

      <form onSubmit={handleQuery} className="relative">
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === 'maps' ? "Find landmarks, trails, or local spots..." : "Search for recent environmental trends..."}
          className="w-full bg-white border border-[#E2E8DE] rounded-2xl px-6 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-[#2D4739]/10 text-[#2D4739] shadow-sm"
        />
        <button disabled={loading} className="absolute right-2 top-2 bottom-2 px-6 bg-[#2D4739] hover:bg-[#1A2C23] disabled:opacity-50 text-white rounded-xl transition-all font-bold">
          {loading ? '...' : '→'}
        </button>
      </form>

      {results && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white border border-[#E2E8DE] rounded-2xl p-8 shadow-sm relative">
             <h3 className="text-xs font-mono text-[#2D4739]/40 uppercase tracking-widest mb-6 font-bold">Grounded Signal Report</h3>
             <div className="prose max-w-none text-[#4A443F] leading-relaxed text-sm italic">
                {results.text.split('\n').map((line, i) => <p key={i} className="mb-4">"{line}"</p>)}
             </div>

             {/* MANDATORY: URL extraction and listing for grounding results */}
             {results.sources && results.sources.length > 0 && (
               <div className="mt-8 pt-6 border-t border-[#E2E8DE] space-y-4">
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E8B82]">Verified Sources</p>
                 <div className="flex flex-wrap gap-2">
                   {results.sources.map((chunk: any, i: number) => {
                     const source = chunk.web || chunk.maps;
                     if (!source?.uri) return null;
                     return (
                       <a 
                         key={i} 
                         href={source.uri} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="px-4 py-2 bg-[#F9F9F7] border border-[#E2E8DE] rounded-xl text-[10px] text-[#2D4739] font-bold hover:bg-white hover:shadow-md transition-all flex items-center space-x-2"
                       >
                         <span className="truncate max-w-[200px]">{source.title || 'View Grounding'}</span>
                         <svg className="w-3 h-3 text-[#2D4739]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                         </svg>
                       </a>
                     );
                   })}
                 </div>
               </div>
             )}
             
             {!artifact && (
               <button 
                 onClick={handleGenerateOverlay}
                 disabled={generatingArtifact}
                 className="mt-10 w-full py-4 bg-[#FDFDFB] border border-[#E2E8DE] hover:bg-[#E2E8DE]/20 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all text-[#2D4739] shadow-sm"
               >
                 {generatingArtifact ? 'Synthesizing Overlay...' : 'Generate Grounded Map Overlay'}
               </button>
             )}
          </div>

          {artifact && (
            <div className="bg-white border border-[#E2E8DE] rounded-3xl p-6 shadow-sm overflow-hidden animate-in zoom-in-95 duration-500">
               <div className="relative group aspect-square max-w-lg mx-auto">
                 <img src={artifact.url} className="w-full h-full object-cover rounded-2xl shadow-inner border border-[#E2E8DE]" alt="Overlay" />
                 <div className="absolute bottom-6 left-6 bg-[#2D4739]/90 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/20 shadow-2xl">
                    <p className="text-[10px] font-mono text-white tracking-widest uppercase font-bold">{artifact.title}</p>
                 </div>
               </div>
               <p className="text-[11px] text-[#8E8B82] mt-6 text-center italic font-medium leading-relaxed max-w-sm mx-auto">
                 "{artifact.description}"
               </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExplorationView;

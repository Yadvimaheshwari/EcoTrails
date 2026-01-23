
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
      const data = mode === 'maps' ? await mapGrounding(query) : await searchGrounding(query);
      setResults(data);
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
      const art = await generateVisualArtifact('terrain_synthesis', results.text);
      setArtifact(art);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingArtifact(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-32 pt-8 animate-in fade-in duration-700">
      <header className="text-center space-y-3">
        <div className="w-12 h-1 bg-[#2D4739] mx-auto rounded-full mb-4"></div>
        <h2 className="text-display text-[#2D4739]">Terrain Intelligence</h2>
        <p className="text-body text-[#8E8B82]">Ground your observations in real-world geographic data.</p>
      </header>

      <div className="flex justify-center">
        <div className="bg-[#E2E8DE]/40 p-1.5 rounded-[24px] flex backdrop-blur shadow-inner border border-[#E2E8DE]/20">
          <button 
            onClick={() => setMode('maps')}
            className={`px-8 py-3.5 rounded-[18px] text-[10px] transition-all font-bold uppercase tracking-[0.2em] ${mode === 'maps' ? 'bg-[#2D4739] text-white shadow-xl' : 'text-[#8E8B82] hover:text-[#2D4739]'}`}
          >
            Google Maps
          </button>
          <button 
            onClick={() => setMode('search')}
            className={`px-8 py-3.5 rounded-[18px] text-[10px] transition-all font-bold uppercase tracking-[0.2em] ${mode === 'search' ? 'bg-[#2D4739] text-white shadow-xl' : 'text-[#8E8B82] hover:text-[#2D4739]'}`}
          >
            Live Web
          </button>
        </div>
      </div>

      <form onSubmit={handleQuery} className="relative group">
        <div className="absolute inset-0 bg-[#2D4739]/5 rounded-[32px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === 'maps' ? "Search coordinates, peaks, or trail junctions..." : "Ask about park ecology, news, or history..."}
          className="w-full bg-white border border-[#E2E8DE] rounded-[32px] px-10 py-7 pr-24 focus:outline-none focus:ring-4 focus:ring-[#2D4739]/5 text-[#2D4739] shadow-xl text-lg font-medium placeholder-[#8E8B82]/50 relative z-10"
        />
        <button disabled={loading} className="absolute right-4 top-4 bottom-4 px-8 bg-[#2D4739] hover:bg-[#1A2C23] disabled:opacity-50 text-white rounded-[24px] transition-all font-bold z-20 shadow-lg">
          {loading ? (
             <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
             </svg>
          )}
        </button>
      </form>

      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-bottom-12 duration-700">
          <div className="space-y-8">
             <div className="soft-card p-10 bg-white border-none shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#2D4739]"></div>
                <h3 className="text-[10px] font-bold text-[#8E8B82] uppercase tracking-[0.2em] mb-8">Intelligence Synthesis</h3>
                <div className="prose max-w-none text-[#4A443F] leading-relaxed font-serif italic text-xl">
                   {results.text.split('\n').filter(l => l.trim()).map((line, i) => (
                     <p key={i} className="mb-6 last:mb-0">"{line}"</p>
                   ))}
                </div>

                {!artifact && (
                  <button 
                    onClick={handleGenerateOverlay}
                    disabled={generatingArtifact}
                    className="mt-10 w-full py-5 bg-[#F9F9F7] border border-[#E2E8DE] rounded-[24px] text-[10px] font-bold uppercase tracking-[0.3em] transition-all text-[#2D4739] hover:bg-white hover:shadow-2xl active:scale-[0.98]"
                  >
                    {generatingArtifact ? 'Synthesizing Visual...' : 'Generate Terrain Sketch'}
                  </button>
                )}
             </div>
          </div>

          <div className="space-y-8">
            {results.sources && results.sources.length > 0 ? (
              <div className="space-y-4">
                 <h3 className="text-caption uppercase tracking-widest px-2">Grounded Geographic Nodes</h3>
                 <div className="grid grid-cols-1 gap-4">
                    {results.sources.map((chunk: any, i: number) => {
                      const source = chunk.web || chunk.maps;
                      if (!source?.uri) return null;
                      return (
                        <a 
                          key={i} 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="soft-card p-6 bg-white flex items-center justify-between group hover:border-[#2D4739] hover:shadow-xl transition-all border border-[#E2E8DE]/40"
                        >
                          <div className="flex items-center space-x-5">
                             <div className="w-14 h-14 bg-[#F9F9F7] rounded-[20px] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                {mode === 'maps' ? '📍' : '🌐'}
                             </div>
                             <div className="overflow-hidden">
                                <p className="text-sm font-bold text-[#2D4739] truncate max-w-[200px] mb-1">{source.title || 'Regional Insight'}</p>
                                <p className="text-[10px] text-[#8E8B82] font-mono truncate opacity-60">
                                   {new URL(source.uri).hostname}
                                </p>
                             </div>
                          </div>
                          <div className="text-[#2D4739] opacity-30 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                             </svg>
                          </div>
                        </a>
                      );
                    })}
                 </div>
              </div>
            ) : (
              <div className="soft-card p-16 text-center bg-[#F9F9F7] border-dashed border-2 border-[#E2E8DE] opacity-60">
                 <p className="text-caption">Grounded sources will appear here.</p>
              </div>
            )}

            {artifact && (
              <div className="soft-card p-6 bg-white overflow-hidden animate-in zoom-in-95 duration-700 shadow-2xl group">
                 <img src={artifact.url} className="w-full h-auto rounded-[20px] shadow-lg mb-6 group-hover:scale-[1.02] transition-transform duration-1000" alt="Synthesis" />
                 <div className="px-2 pb-2">
                    <p className="text-[10px] font-bold text-[#2D4739] uppercase tracking-[0.2em] mb-3">{artifact.title}</p>
                    <p className="text-sm text-[#4A443F] italic leading-relaxed opacity-80">"{artifact.description}"</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplorationView;

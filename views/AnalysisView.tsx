import React, { useState, useRef } from 'react';
import { EcoAtlasCrew, Schemas } from '../backend';
import { 
  EnvironmentalRecord, 
  PerceptionResult, 
  NarrationResult,
  TemporalChangeResult,
  AcousticResult,
  SynthesisResult,
  ConfidenceLevel
} from '../types';

interface AnalysisViewProps {
  onRecordFound: (record: EnvironmentalRecord) => void;
  records: EnvironmentalRecord[];
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
  <div className="mt-4 p-4 bg-orange-50/50 rounded-xl border border-orange-100 space-y-2">
    <p className="text-[10px] text-orange-800 leading-relaxed font-medium">
      <span className="font-bold">Observation Note:</span> {explanation}
    </p>
    <p className="text-[10px] text-[#2D4739] italic opacity-60">
      <span className="font-bold">Guidance:</span> {suggestion}
    </p>
  </div>
);

const AnalysisView: React.FC<AnalysisViewProps> = ({ onRecordFound, records }) => {
  const [file, setFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [results, setResults] = useState<{
    perception?: PerceptionResult;
    temporal?: TemporalChangeResult;
    acoustic?: AcousticResult;
    synthesis?: SynthesisResult;
    narration?: NarrationResult;
    artifact?: string;
  }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setResults({});
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setAudioFile(selected);
  };

  const runAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    setStatus('Preparing environmental synthesis...');

    const getBase64 = (f: File): Promise<string> => new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
    });

    try {
      const visualBase64 = await getBase64(file);
      const crew = new EcoAtlasCrew(records);

      setStatus('Sensing immediate signals...');
      const p = await crew.executeTask("Observer", {}, Schemas.Perception, "Analyze environmental signals.", { base64: visualBase64, mimeType: file.type });
      
      let acousticResult = null;
      if (audioFile) {
        setStatus('Listening to the soundscape...');
        const audioBase64 = await getBase64(audioFile);
        const a = await crew.executeTask("Listener", {}, Schemas.Acoustic, "Analyze ambient soundscape.", { base64: audioBase64, mimeType: audioFile.type });
        acousticResult = a.output;
      }

      setStatus('Consulting historical records...');
      const t = await crew.executeTask("Historian", { current_perception: p.output }, Schemas.Temporal, "Analyze temporal changes.", { base64: visualBase64, mimeType: file.type });

      // Mocked wearable/effort context for the synthesizer
      const experienceContext = {
        motion_patterns: "Slow ascent with frequent brief pauses.",
        elevation_delta: "+150m over 2km",
        stops: "3 long pauses (5min+) at viewpoint coordinates.",
        environment_stress: acousticResult?.activity_levels?.wind === 'Strong' ? "High wind exposure" : "Calm conditions"
      };

      setStatus('Synthesizing experience insights...');
      const s = await crew.executeTask("Synthesizer", { p: p.output, context: experienceContext }, Schemas.Synthesis, "Infer trail difficulty, fatigue zones, and accessibility notes.");

      setStatus('Verifying environmental truth...');
      const v = await crew.executeTask("Auditor", { p: p.output, t: t.output, a: acousticResult, s: s.output }, Schemas.Verification, "Verify signals for scientific consistency.");
      
      setStatus('Composing your field note...');
      const n = await crew.executeTask("Bard", v.output, Schemas.Narration, "Synthesize all insights into a warm, structured narrative field note.");
      
      setStatus('Illustrating findings...');
      const art = await crew.executeTask("Illustrator", v.output, null, "Generate a technical field sketch.");

      setResults({ 
        perception: p.output, 
        temporal: t.output, 
        acoustic: acousticResult, 
        synthesis: s.output,
        narration: n.output, 
        artifact: art.output 
      });
    } catch (err) {
      console.error(err);
      setStatus("Nature is complex. Let's try another perspective.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 pb-32">
      <header className="space-y-1 text-center">
        <p className="text-caption">Deep Intelligence</p>
        <h2 className="text-h1 text-[#2D4739]">Synthesis Engine</h2>
      </header>

      {!results.narration && !loading && (
        <div className="space-y-4">
          <section 
            onClick={() => fileInputRef.current?.click()}
            className="soft-card p-16 flex flex-col items-center justify-center cursor-pointer hover:bg-white/50 transition-all text-center border-dashed relative overflow-hidden"
          >
            {previewUrl ? (
              <img src={previewUrl} className="absolute inset-0 w-full h-full object-cover opacity-10" alt="Preview" />
            ) : (
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">📸</div>
            )}
            <div className="relative z-10">
              <p className="text-h2 text-[#2D4739]">Add Visual Frame</p>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
          </section>

          <section 
            onClick={() => audioInputRef.current?.click()}
            className={`soft-card p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-white/50 transition-all text-center border-dashed ${audioFile ? 'bg-emerald-50 border-emerald-200' : ''}`}
          >
            <div className="text-2xl mb-2">{audioFile ? '🔊' : '🎤'}</div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#2D4739]">
              {audioFile ? 'Audio Sample Ready' : 'Add Soundscape Sample'}
            </p>
            <input type="file" ref={audioInputRef} onChange={handleAudioChange} className="hidden" accept="audio/*" />
          </section>
        </div>
      )}

      {loading && (
        <div className="py-24 text-center space-y-8">
           <div className="w-12 h-12 mx-auto border-4 border-t-[#2D4739] border-gray-100 rounded-full animate-spin"></div>
           <p className="text-body font-medium text-[#2D4739] animate-pulse">{status}</p>
        </div>
      )}

      {file && !loading && !results.narration && (
        <button onClick={runAnalysis} className="w-full py-5 btn-pine text-h2 shadow-lg">
          Initiate Synthesis
        </button>
      )}

      {results.narration && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 space-y-16">
          <section className="soft-card p-10 bg-[#FDFDFB] border-[#E2E8DE] border-2 space-y-10">
             <div className="text-center space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-800/40">Field Narrative</p>
                <div className="w-12 h-[1px] bg-emerald-800/10 mx-auto"></div>
             </div>
             
             <div className="space-y-8 font-serif italic text-lg leading-relaxed text-[#2D4739]/90">
                <p>"{results.narration.overview}"</p>
                <p>"{results.narration.revelations}"</p>
                <p>"{results.narration.changes}"</p>
                <div className="pt-6 border-t border-emerald-800/5">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800/40 mb-3 font-sans not-italic">For your next walk</p>
                   <p className="text-sm">"{results.narration.future_notes}"</p>
                </div>
             </div>
          </section>

          {results.synthesis && (
            <section className="space-y-4">
              <div className="flex justify-between items-end px-1">
                <h3 className="text-caption uppercase tracking-widest">Trail Human Interface</h3>
                <ConfidenceBadge level={results.synthesis.confidence} />
              </div>
              <div className="soft-card p-8 bg-white space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#2D4739]/50">Difficulty Perception</p>
                    <p className="text-h2 text-[#2D4739]">{results.synthesis.trail_difficulty_perception}</p>
                  </div>
                  <div className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    results.synthesis.exposure_stress.level === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {results.synthesis.exposure_stress.level} Exposure
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E8B82]">Beginner Observations</h4>
                      <ul className="space-y-2">
                        {results.synthesis.beginner_tips.map((tip, i) => (
                          <li key={i} className="text-sm text-[#4A443F] flex items-start space-x-2">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                   </div>
                   <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Safety Notes</h4>
                      <ul className="space-y-2">
                        {results.synthesis.safety_observations.map((note, i) => (
                          <li key={i} className="text-sm text-[#4A443F] flex items-start space-x-2">
                            <span className="text-orange-500 font-bold">!</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                   </div>
                </div>

                {results.synthesis.confidence !== 'High' && (
                  <UncertaintyNotice 
                    explanation={results.synthesis.uncertainty_explanation} 
                    suggestion={results.synthesis.improvement_suggestion} 
                  />
                )}
              </div>
            </section>
          )}

          {results.acoustic && (
            <section className="space-y-4">
               <div className="flex justify-between items-end px-1">
                 <h3 className="text-caption uppercase tracking-widest">Ambient Soundscape Profile</h3>
                 <ConfidenceBadge level={results.acoustic.confidence} />
               </div>
               <div className="soft-card p-8 bg-white space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-3">
                       <p className="text-body text-[#4A443F] leading-relaxed italic">"{results.acoustic.soundscape_summary}"</p>
                       <p className="text-[10px] text-[#8E8B82]">{results.acoustic.notable_changes}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       {Object.entries(results.acoustic.activity_levels).map(([k, v]) => (
                         <div key={k} className="bg-[#F9F9F7] p-3 rounded-xl border border-[#E2E8DE]">
                            <p className="text-[8px] uppercase font-bold text-gray-400 mb-1">{k}</p>
                            <p className="text-xs font-bold text-[#2D4739]">{v}</p>
                         </div>
                       ))}
                    </div>
                  </div>
                  {results.acoustic.confidence !== 'High' && (
                    <UncertaintyNotice 
                      explanation={results.acoustic.uncertainty_explanation} 
                      suggestion={results.acoustic.improvement_suggestion} 
                    />
                  )}
               </div>
            </section>
          )}
          
          <div className="flex space-x-4">
            <button onClick={() => {setResults({}); setFile(null); setPreviewUrl(null);}} className="flex-1 py-5 bg-white border border-[#E2E8DE] text-[#2D4739] text-h2 font-bold rounded-2xl">
              New Observation
            </button>
            <button className="flex-1 py-5 btn-pine text-h2 font-bold rounded-2xl shadow-lg">
              Save to Journal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisView;
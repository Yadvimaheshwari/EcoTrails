
import React, { useState, useEffect } from 'react';
import { EnvironmentalRecord, MediaPacket } from '../types';

interface AnalysisViewProps {
  packet: MediaPacket;
  parkName: string;
  records: EnvironmentalRecord[];
  onComplete: (record: EnvironmentalRecord) => void;
}

const STEPS = [
  { id: 'telemetry', label: 'Rhythm', agent: 'Technician', desc: 'Feeling the heart of the trail', weight: 10 },
  { id: 'perception', label: 'Vision', agent: 'Observer', desc: 'Connecting with the landscape', weight: 30 },
  { id: 'acoustic', label: 'Sound', agent: 'Listener', desc: 'Hearing the subtle frequencies', weight: 50 },
  { id: 'fusion', label: 'Perspective', agent: 'Fusionist', desc: 'Aligning with the mountain', weight: 65 },
  { id: 'spatial', label: 'Place', agent: 'Spatial', desc: 'Grounding in shared memory', weight: 80 },
  { id: 'temporal', label: 'History', agent: 'Historian', desc: 'Noticing what is changing', weight: 90 },
  { id: 'narrative', label: 'Story', agent: 'Bard', desc: 'Writing your field note', weight: 100 }
];

const AnalysisView: React.FC<AnalysisViewProps> = ({ packet, parkName, records, onComplete }) => {
  const [activeStepId, setActiveStepId] = useState<string>('telemetry');
  const [status, setStatus] = useState('Atlas is connecting what it observed');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const runSynthesis = async () => {
      if (packet.segments.length === 0) {
        onComplete({
          id: packet.sessionId,
          timestamp: Date.now(),
          park_name: parkName,
          location: { lat: 0, lng: 0, name: parkName },
          confidence: 'Medium',
          summary: "No media provided for analysis. The rhythm of the trail is being noted.",
          multimodalEvidence: [],
          tags: ['A quiet walk']
        });
        return;
      }

      const formData = new FormData();
      try {
        for (let i = 0; i < packet.segments.length; i++) {
          const segment = packet.segments[i];
          const res = await fetch(`data:${segment.mimeType};base64,${segment.base64}`);
          const blob = await res.blob();
          formData.append('images', blob, `observation_${i}.jpg`);
        }
        
        formData.append('park_name', parkName);
        
        const mockSensors = Array.from({ length: 5 }, (_, i) => ({
           timestamp: Date.now() - (i * 600000),
           altitude: 1240 + (i * 10),
           heart_rate: 70 + (i * 5),
           motion_cadence: 120,
           lat: 45.0 + (i * 0.001),
           lng: -120.0 + (i * 0.001)
        }));

        formData.append('sensor_json', JSON.stringify(mockSensors));
        formData.append('history_json', JSON.stringify(records.slice(0, 5).map(r => ({
          park_name: r.park_name,
          summary: r.summary,
          tags: r.tags
        }))));

        setStatus('The world is revealing its secrets slowly');
        
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev < 95) return prev + 1;
            return prev;
          });
        }, 300);

        const apiResponse = await fetch('/api/v1/synthesis', {
          method: 'POST',
          body: formData
        });

        if (!apiResponse.ok) throw new Error("The conversation was interrupted.");
        
        const result = await apiResponse.json();
        const data = result.data;
        
        clearInterval(progressInterval);
        setProgress(100);
        setStatus('Nature has written a new chapter for you');

        const finalRecord: EnvironmentalRecord = {
          id: packet.sessionId,
          timestamp: Date.now(),
          park_name: parkName,
          location: { lat: 0, lng: 0, name: parkName },
          confidence: 'High',
          summary: data.narrative.consistent.substring(0, 150),
          multimodalEvidence: packet.segments.map(s => `data:${s.mimeType};base64,${s.base64}`),
          tags: data.perception.inferences?.map((i: any) => i.inference) || ['Discovery'],
          observation_events: data.telemetry.events,
          acoustic_analysis: data.acoustic,
          fusion_analysis: data.fusion,
          field_narrative: {
            consistent: data.narrative.consistent,
            different: data.narrative.different,
            changing: data.narrative.changing,
            uncertain: data.narrative.uncertain
          },
          spatial_insight: { 
            text: data.spatial, 
            sources: [] 
          },
          temporal_delta: data.temporal.comparison_narrative,
          experience_synthesis: {
            confidence: 'High',
            trail_difficulty_perception: "Connecting the signals",
            beginner_tips: data.perception.visual_patterns?.slice(0, 3) || []
          }
        };

        setTimeout(() => onComplete(finalRecord), 1500);
      } catch (err) {
        console.error("Synthesis Orchestration Error:", err);
        setStatus('The path is obscured for a moment');
        setTimeout(() => onComplete({
          id: packet.sessionId,
          timestamp: Date.now(),
          park_name: parkName,
          location: { lat: 0, lng: 0, name: parkName },
          confidence: 'Low',
          summary: "A story was partially told.",
          multimodalEvidence: packet.segments.map(s => `data:${s.mimeType};base64,${s.base64}`),
          tags: ['Unfinished note']
        }), 2000);
      }
    };

    runSynthesis();
  }, []);

  return (
    <div className="max-w-xl mx-auto min-h-[80vh] flex flex-col pt-12 space-y-12 animate-in fade-in duration-700">
      <header className="text-center space-y-3">
        <div className="w-16 h-16 bg-[#2D4739] rounded-[24px] flex items-center justify-center mx-auto mb-4 text-white shadow-2xl">
           <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
           </svg>
        </div>
        <h2 className="text-display text-[#2D4739]">Connecting the signals</h2>
        <p className="text-body text-[#8E8B82]">Specialists are gathering their notes about the path you walked.</p>
      </header>

      <div className="space-y-4">
        <div className="flex justify-between items-end px-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#2D4739]">Thinking with care</p>
          <p className="text-h2 text-[#2D4739] font-mono">{progress}%</p>
        </div>
        <div className="h-3 w-full bg-[#E2E8DE] rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-[#2D4739] transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="soft-card p-8 bg-white space-y-6 shadow-2xl border-none">
        <p className="text-[10px] font-bold text-[#8E8B82] uppercase tracking-[0.2em] border-b border-[#F9F9F7] pb-4">Specialists are gathering</p>
        <div className="space-y-6">
          {STEPS.map((step) => {
            const isDone = progress >= step.weight;
            const isActive = progress < step.weight && progress > (step.weight - (step.id === 'telemetry' ? 10 : 15));
            return (
              <div key={step.id} className={`flex items-center justify-between transition-all duration-700 ${isDone || isActive ? 'opacity-100 scale-100' : 'opacity-20 scale-95'}`}>
                <div className="flex items-center space-x-5">
                  <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center text-xs border-2 transition-all duration-500 ${
                    isDone ? 'bg-[#2D4739] border-[#2D4739] text-white' : 
                    isActive ? 'border-[#2D4739] text-[#2D4739] animate-pulse' : 
                    'bg-[#F9F9F7] border-[#E2E8DE] text-[#8E8B82]'
                  }`}>
                    {isDone ? '✓' : ''}
                    {isActive && <div className="w-2 h-2 bg-[#2D4739] rounded-full animate-ping" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#2D4739] uppercase tracking-wider mb-0.5">{step.label}</p>
                    <p className="text-[10px] text-[#8E8B82] font-mono">{step.desc}</p>
                  </div>
                </div>
                {isActive && <span className="text-[10px] font-bold text-[#2D4739] animate-pulse font-mono">WORKING</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;

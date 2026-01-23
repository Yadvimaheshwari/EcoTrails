
import React, { useState, useEffect } from 'react';

interface OnboardingViewProps {
  onComplete: () => void;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [pairing, setPairing] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<string[]>([]);

  const slides = [
    {
      title: "EcoAtlas Activation",
      description: "You are now part of a global network of autonomous environmental observers. Atlas transforms your hike into high-fidelity ecological intelligence.",
      image: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&q=80&w=800",
      cta: "Initialize System"
    },
    {
      title: "Sensor Calibration",
      description: "Atlas requires connection to your bio-sensors and environmental nodes to accurately map heart rate, terrain pressure, and acoustic signals.",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800",
      cta: "Search for Devices"
    },
    {
      title: "Agentic Synthesis",
      description: "At the end of every mission, four specialized AI agents collaborate to verify findings, ground them in history, and compose your Field Note.",
      image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&q=80&w=800",
      cta: "Begin Exploration"
    }
  ];

  const handleAction = () => {
    if (step === 1 && !pairing && discoveredDevices.length === 0) {
      setPairing(true);
      // Simulate device discovery
      setTimeout(() => {
        setDiscoveredDevices(['Atlas Heart-Node v2', 'Terrain Pressure Hub', 'Acoustic Array 1']);
        setPairing(false);
      }, 3000);
      return;
    }

    if (step === 1 && discoveredDevices.length > 0) {
      setStep(2);
      return;
    }
    
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      <div className="max-w-md w-full space-y-12 transition-all duration-700">
        <div className="relative aspect-square w-full rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in duration-1000">
          <img src={slides[step].image} className="w-full h-full object-cover transition-transform duration-[2000ms] scale-110" alt="Nature" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2D4739]/60 to-transparent flex flex-col items-center justify-center p-8 text-white">
            {pairing && (
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-8 rounded-[32px] flex flex-col items-center space-y-4 shadow-2xl animate-pulse w-full">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Scanning Local Frequencies...</span>
              </div>
            )}
            {!pairing && discoveredDevices.length > 0 && step === 1 && (
              <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">3 Nodes Discovered</p>
                {discoveredDevices.map(d => (
                   <div key={d} className="bg-white/10 backdrop-blur border border-white/20 p-4 rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-bold">{d}</span>
                      <span className="text-[10px] bg-emerald-500 px-2 py-0.5 rounded-full">CONNECTED</span>
                   </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-display text-[#2D4739]">{slides[step].title}</h1>
          <p className="text-body text-[#4A443F] leading-relaxed max-w-sm mx-auto opacity-80">
            {slides[step].description}
          </p>
        </div>

        <div className="space-y-8 pt-4">
          <button 
            disabled={pairing}
            onClick={handleAction}
            className="w-full py-5 btn-pine text-h2 shadow-xl shadow-emerald-900/10 disabled:opacity-50"
          >
            {pairing ? 'Searching...' : slides[step].cta}
          </button>
          
          <div className="flex justify-center space-x-2">
            {slides.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-[#2D4739]' : 'w-2 bg-[#E2E8DE]'}`} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;

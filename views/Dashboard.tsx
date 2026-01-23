
import React, { useState, useEffect } from 'react';
import { SensorData, InterfaceState } from '../types';
import { recommendInterfaceState } from '../geminiService';

interface DashboardProps {
  activePark: string | null;
  onStart: () => void;
  onEnd: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ activePark, onStart, onEnd }) => {
  const [sensors, setSensors] = useState<SensorData>({
    altitude: 1240, 
    heart_rate: 72, 
    pressure: 1013, 
    uv_index: 2, 
    battery: 98, 
    signal_strength: 100,
    velocity: 0,
    climb_rate: 0,
    cadence: 0
  });

  const [uiState, setUiState] = useState<InterfaceState>('show ambient indicators');
  const [rationale, setRationale] = useState('Atlas is settling into the environment.');

  useEffect(() => {
    if (!activePark) return;
    
    // Simulate sensor flux
    const interval = setInterval(() => {
      setSensors(prev => {
        const climbing = Math.random() > 0.5;
        return {
          ...prev,
          altitude: prev.altitude + (climbing ? 0.5 : -0.2),
          heart_rate: 80 + Math.floor(Math.random() * 60),
          velocity: 3.5 + (Math.random() * 2),
          climb_rate: climbing ? 15 : -5,
          cadence: 110 + Math.floor(Math.random() * 20),
          battery: prev.battery - 0.01
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [activePark]);

  useEffect(() => {
    if (!activePark) return;
    
    // Periodically reassess interface state
    const reassess = async () => {
      const { state, rationale } = await recommendInterfaceState(sensors, 'active');
      setUiState(state);
      setRationale(rationale);
    };

    const interval = setInterval(reassess, 15000);
    reassess(); // Initial check
    
    return () => clearInterval(interval);
  }, [activePark, sensors]);

  if (!activePark) {
    return (
      <section className="space-y-12 py-20 text-center animate-in fade-in duration-1000">
        <div className="w-24 h-24 bg-[#2D4739] rounded-[40px] flex items-center justify-center mx-auto shadow-2xl animate-pulse">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
        <div className="space-y-4">
          <h1 className="text-display text-[#2D4739]">Walking with Atlas</h1>
          <p className="text-body text-[#8E8B82] max-w-xs mx-auto">
            A quiet observer for the paths you choose to follow.
          </p>
        </div>
        <button onClick={onStart} className="px-12 py-5 btn-pine text-h2 shadow-xl">A new path is waiting</button>
      </section>
    );
  }

  // Adaptive UI Logic
  const renderLayout = () => {
    switch (uiState) {
      case 'minimize interface':
        return (
          <div className="flex-1 flex flex-col justify-center items-center space-y-12 animate-in fade-in zoom-in-95 duration-1000">
             <div className="w-32 h-32 rounded-full border-4 border-[#2D4739]/5 flex items-center justify-center">
                <div className="w-24 h-24 bg-[#2D4739] rounded-full flex items-center justify-center shadow-2xl">
                   <p className="text-h2 text-white font-mono">{sensors.heart_rate}</p>
                </div>
             </div>
             <p className="text-caption uppercase tracking-[0.4em] text-[#2D4739] animate-pulse">Focused observation active</p>
          </div>
        );

      case 'show ambient indicators':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-2 gap-4">
               <div className="soft-card p-6 bg-white text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Rhythm</p>
                  <p className="text-h1 text-[#2D4739]">{sensors.heart_rate}</p>
               </div>
               <div className="soft-card p-6 bg-white text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Elevation</p>
                  <p className="text-h1 text-[#2D4739]">{sensors.altitude.toFixed(0)}m</p>
               </div>
            </div>
            <div className="soft-card p-4 bg-emerald-50 border-emerald-100 flex items-center justify-center space-x-3">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
               <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">Steady pace maintained</p>
            </div>
          </div>
        );

      case 'expand insights':
        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-1000">
             <section className="grid grid-cols-3 gap-4">
                <div className="soft-card p-4 space-y-1 bg-white">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Climb</p>
                  <p className="text-h2 text-[#2D4739]">{sensors.climb_rate}m/m</p>
                </div>
                <div className="soft-card p-4 space-y-1 bg-white">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Speed</p>
                  <p className="text-h2 text-[#2D4739]">{sensors.velocity.toFixed(1)}k</p>
                </div>
                <div className="soft-card p-4 space-y-1 bg-white">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Cadence</p>
                  <p className="text-h2 text-[#2D4739]">{sensors.cadence}</p>
                </div>
             </section>
             <section className="soft-card overflow-hidden bg-[#2D4739] relative group">
                <div className="h-48 relative">
                   <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b" className="w-full h-full object-cover opacity-60" alt="Terrain" />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#2D4739] via-transparent"></div>
                </div>
                <div className="p-6 text-white space-y-2">
                   <h3 className="text-h2 italic">Curiosity is flourishing</h3>
                   <p className="text-xs text-white/60">A moment of pause allows for deeper environmental synthesis.</p>
                </div>
             </section>
          </div>
        );

      case 'defer interaction':
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 text-center animate-in zoom-in-90 duration-1000">
             <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
             </div>
             <div className="space-y-2">
                <h3 className="text-h2 text-[#2D4739]">Focus on the path</h3>
                <p className="text-caption max-w-xs mx-auto">The current terrain requires your full attention. Atlas is observing quietly in the background.</p>
             </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-xl mx-auto min-h-[85vh] flex flex-col pb-32 pt-8">
      <header className="flex justify-between items-center mb-8">
        <div className="space-y-1">
          <p className="text-caption uppercase tracking-widest">Currently walking</p>
          <h2 className="text-h1 text-[#2D4739]">{activePark}</h2>
        </div>
        <div className="text-right">
           <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Interface logic</p>
           <p className="text-[10px] font-medium text-[#2D4739] bg-white px-3 py-1 rounded-full border border-[#E2E8DE]">{uiState}</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col">
         {renderLayout()}
      </div>

      {uiState !== 'minimize interface' && uiState !== 'defer interaction' && (
        <div className="mt-auto pt-8">
           <p className="text-[10px] text-[#8E8B82] italic text-center mb-8 px-4">
             "{rationale}"
           </p>
           <button onClick={onEnd} className="w-full py-5 bg-red-600 text-white rounded-2xl text-h2 font-bold shadow-xl hover:bg-red-700 transition-all">
             The walk is complete
           </button>
        </div>
      )}

      {(uiState === 'minimize interface' || uiState === 'defer interaction') && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[60]">
           <button 
             onClick={onEnd}
             className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white"
             aria-label="Finish session"
           >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                 <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
           </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

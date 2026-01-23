
import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { EnvironmentalRecord, AppView } from '../types';
import MediaIngestionView from './MediaIngestionView';

interface DashboardProps {
  records: EnvironmentalRecord[];
}

const mockElevationData = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  elevation: 420 + Math.sin(i / 4) * 30 + Math.random() * 5
}));

const Dashboard: React.FC<DashboardProps> = ({ records }) => {
  const [isHikeActive, setIsHikeActive] = useState(false);
  const [connectingHardware, setConnectingHardware] = useState(false);
  const [hasHardware, setHasHardware] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showIngestion, setShowIngestion] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleStartHike = (withHardware: boolean) => {
    if (withHardware && !hasHardware) {
      setConnectingHardware(true);
      setTimeout(() => {
        setConnectingHardware(false);
        setHasHardware(true);
        setIsHikeActive(true);
      }, 3000);
    } else {
      setIsHikeActive(true);
    }
  };

  if (showIngestion) {
    return <MediaIngestionView onCancel={() => setShowIngestion(false)} />;
  }

  if (connectingHardware) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-12 text-center animate-in fade-in duration-700">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-[#2D4739]/10 border-t-[#2D4739] animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-h1 text-[#2D4739]">Waking up the sensor</h2>
          <p className="text-body text-[#8E8B82]">Atlas is connecting to your EcoDroid companion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-10 pb-32 animate-in fade-in duration-1000">
      {isOffline && (
        <div className="bg-[#2D4739] text-white p-4 rounded-2xl flex items-center space-x-4 animate-in slide-in-from-top-4 duration-500 shadow-lg">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg">⛰️</div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Disconnected, but still present</p>
            <p className="text-xs">Deep in the wild. Atlas is recording locally.</p>
          </div>
        </div>
      )}

      <header className="flex justify-between items-end px-1">
        <div className="space-y-1">
          <p className="text-caption">Current location</p>
          <h2 className="text-h1 text-[#2D4739]">{isHikeActive ? "Highland Trail" : "Awaiting the path"}</h2>
        </div>
        <div className="text-right pb-1">
          <p className={`text-caption ${isHikeActive ? 'text-emerald-600/70' : 'text-orange-600/70'} flex items-center justify-end`}>
            <span className={`w-1.5 h-1.5 ${isHikeActive ? 'bg-emerald-500' : 'bg-orange-500'} rounded-full mr-2 animate-pulse`}></span>
            {isHikeActive ? (hasHardware ? 'EcoDroid active' : 'Internal senses active') : 'Awaiting start'}
          </p>
        </div>
      </header>

      {!isHikeActive ? (
        <section className="space-y-6 pt-12">
          <div className="soft-card p-10 text-center space-y-8 bg-white border-none shadow-xl">
             <div className="w-20 h-20 bg-[#F9F9F7] rounded-[30px] flex items-center justify-center mx-auto text-4xl">🥾</div>
             <div className="space-y-3">
               <h3 className="text-h1 text-[#2D4739]">Ready for a walk?</h3>
               <p className="text-body text-[#4A443F] opacity-70 leading-relaxed max-w-xs mx-auto">
                 Begin your journey to track environmental shifts and create your field journal.
               </p>
             </div>
             <div className="space-y-3 pt-4">
                <button onClick={() => handleStartHike(false)} className="w-full py-5 btn-pine text-h2">Start mindful hike</button>
                <button onClick={() => handleStartHike(true)} className="w-full py-4 text-[#2D4739] text-[10px] font-bold uppercase tracking-widest border border-[#E2E8DE] rounded-2xl hover:bg-[#F9F9F7] transition-all">Connect EcoDroid hardware</button>
             </div>
          </div>
          {!hasHardware && (
            <div className="bg-[#E2E8DE]/30 p-8 rounded-[32px] space-y-4 border border-white/50">
              <h4 className="text-caption uppercase tracking-widest text-[#2D4739]">Wish to see the unseen?</h4>
              <p className="text-xs text-[#4A443F] leading-relaxed opacity-80">Bringing a dedicated **EcoDroid** companion adds multi-spectral vision and soil hydration sensing to your reports.</p>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="soft-card overflow-hidden group">
            <div className="relative aspect-[16/10]">
              <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="The View" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                <div className="text-white">
                  <p className="text-caption text-white/80">Live path</p>
                  <p className="text-lg font-medium">Sarek North Ridge</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => setShowIngestion(true)} className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-bold text-[#2D4739] uppercase tracking-widest hover:bg-white transition-all shadow-lg">
                    Capture Observation
                  </button>
                  <button onClick={() => setIsHikeActive(false)} className="bg-red-500/80 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-bold text-white uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg">
                    End Hike
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-caption px-1">Nature's story</h3>
            <div className="soft-card p-8 bg-[#FDFDFB]">
              <p className="text-h2 font-light italic leading-relaxed text-[#2D4739]/80 font-['Instrument_Sans']">
                "The morning mist is lifting over the granite ridges. I've noticed a slight increase in ground moisture—a gentle reminder of last night's rain."
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;

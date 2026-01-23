
import React, { useState } from 'react';
import { SensorDevice } from '../types';

interface AccountViewProps {
  onLogout: () => void;
}

const AccountView: React.FC<AccountViewProps> = ({ onLogout }) => {
  const [pairing, setPairing] = useState(false);
  const [devices, setDevices] = useState<SensorDevice[]>([
    { id: 'dev_1', name: 'Atlas Heart-Node', type: 'HeartRate', status: 'connected', battery: 84 },
    { id: 'dev_2', name: 'Terrain Pressure Hub', type: 'Barometer', status: 'connected', battery: 92 },
    { id: 'dev_3', name: 'Acoustic Array 1', type: 'Acoustic', status: 'disconnected', battery: 0 },
  ]);

  const handlePairing = () => {
    setPairing(true);
    setTimeout(() => {
      setDevices(prev => prev.map(d => d.id === 'dev_3' ? { ...d, status: 'connected', battery: 100 } : d));
      setPairing(false);
    }, 2500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-10 py-12 animate-in fade-in duration-700 pb-32">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-display text-[#2D4739]">Intelligence Account</h1>
          <p className="text-caption">Field Specialist: Explorer-741</p>
        </div>
        <div className="w-16 h-16 rounded-full bg-[#2D4739] text-white flex items-center justify-center text-xl font-bold shadow-lg">EA</div>
      </header>

      <section className="bg-[#1A2C23] rounded-[32px] p-8 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center space-x-3">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em]">Telemetry Uplink</p>
           </div>
           <span className="text-[10px] font-mono text-emerald-500/50">ENC_V4.2</span>
        </div>
        <div className="space-y-2 font-mono text-[10px] text-emerald-500/80">
           <p className="opacity-40">{">"} INITIALIZING NODE_SYNC...</p>
           <p className="opacity-60">{">"} HEART_NODE: STABLE (72BPM)</p>
           <p className="opacity-80">{">"} PRESSURE_HUB: 1013MBAR</p>
           <p className="animate-pulse">{">"} READY FOR DEPLOYMENT</p>
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-caption uppercase tracking-widest px-1">Paired Sensor Nodes</h3>
        <div className="space-y-3">
          {devices.map(device => (
            <div key={device.id} className="soft-card p-5 flex items-center justify-between bg-white border-[#E2E8DE]">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${device.status === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                   </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#2D4739]">{device.name}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{device.type}</p>
                </div>
              </div>
              <div className="text-right">
                {device.status === 'connected' ? (
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{device.battery}% Power</span>
                    <div className="w-12 h-1 bg-emerald-100 rounded-full overflow-hidden ml-auto">
                       <div className="h-full bg-emerald-500" style={{ width: `${device.battery}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Offline</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={handlePairing}
          disabled={pairing}
          className="w-full py-4 border-2 border-dashed border-[#E2E8DE] rounded-2xl text-[10px] font-bold uppercase tracking-widest text-[#8E8B82] hover:bg-white transition-all disabled:opacity-50"
        >
          {pairing ? 'Synchronizing Sensors...' : 'Pair New Environmental Node'}
        </button>
      </section>

      <section className="space-y-4">
        <h3 className="text-caption uppercase tracking-widest px-1">System Control</h3>
        <div className="soft-card overflow-hidden bg-white shadow-xl">
          <div className="p-5 border-b border-[#F9F9F7] flex justify-between items-center cursor-pointer hover:bg-[#F9F9F7] transition-all group">
             <span className="text-sm font-medium">Clear Regional Memory</span>
             <span className="text-[#2D4739] transform group-hover:translate-x-1 transition-transform">→</span>
          </div>
          <div className="p-5 border-b border-[#F9F9F7] flex justify-between items-center cursor-pointer hover:bg-[#F9F9F7] transition-all group" onClick={onLogout}>
             <span className="text-sm font-medium text-red-600">Deactivate Account</span>
             <span className="text-red-400 transform group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AccountView;

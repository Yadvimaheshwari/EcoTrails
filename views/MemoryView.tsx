
import React from 'react';
import { EnvironmentalRecord } from '../types';

interface MemoryViewProps {
  records: EnvironmentalRecord[];
  onOpenReport: (record: EnvironmentalRecord) => void;
}

const MemoryView: React.FC<MemoryViewProps> = ({ records, onOpenReport }) => {
  return (
    <div className="max-w-xl mx-auto space-y-8 pb-32 animate-in fade-in duration-700">
      <header className="px-1 space-y-1">
        <p className="text-caption">Your collection</p>
        <h2 className="text-h1 text-[#2D4739]">Field Journal</h2>
      </header>

      {records.length === 0 ? (
        <div className="soft-card p-16 text-center space-y-10 bg-white border-none shadow-xl mt-12">
           <div className="w-24 h-24 bg-[#F9F9F7] rounded-[40px] flex items-center justify-center mx-auto text-4xl">📔</div>
           <div className="space-y-4">
             <h3 className="text-h2 text-[#2D4739]">A blank page in the wild</h3>
             <p className="text-body text-[#8E8B82] max-w-xs mx-auto leading-relaxed">
               Every hiker starts with a first step. Take a walk to begin weaving your story of the natural world.
             </p>
           </div>
           <button 
             className="px-10 py-4 btn-pine text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-900/10"
             onClick={() => window.location.href = '/'} // Simple redirect to dashboard for MVP
           >
             Start your first journey
           </button>
        </div>
      ) : (
        <div className="space-y-6">
          {records.map((record) => (
            <div 
              key={record.id} 
              onClick={() => onOpenReport(record)}
              className="soft-card overflow-hidden hover:shadow-lg transition-all cursor-pointer group active:scale-[0.98]"
            >
               <div className="h-48 relative">
                 <img src={record.multimodalEvidence[0]} className="w-full h-full object-cover" alt="Memory" />
                 <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold text-[#2D4739]">
                      {new Date(record.timestamp).toLocaleDateString()}
                    </span>
                 </div>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-h2 text-[#2D4739] mb-1">{record.location.name}</h3>
                    <p className="text-body text-[#4A443F] line-clamp-2 leading-relaxed italic opacity-80">
                      "{record.summary}"
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {record.tags.map(tag => (
                      <span key={tag} className="text-caption bg-[#E2E8DE]/40 px-3 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemoryView;

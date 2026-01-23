
import React, { useState, useRef } from 'react';
import { runMediaIngestionAgent } from '../geminiService';
import { MediaPacket } from '../types';

interface MediaIngestionViewProps {
  onCancel: () => void;
  onComplete: (packet: MediaPacket) => void;
}

const MediaIngestionView: React.FC<MediaIngestionViewProps> = ({ onCancel, onComplete }) => {
  const [files, setFiles] = useState<{file: File, preview: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [packet, setPacket] = useState<MediaPacket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []) as File[];
    const newFiles = selected.map(f => ({
      file: f,
      preview: URL.createObjectURL(f)
    }));
    setFiles([...files, ...newFiles]);
  };

  const processMedia = async () => {
    if (files.length === 0) {
       onComplete({ sessionId: Date.now().toString(), segments: [], discarded_count: 0, status: 'validated' });
       return;
    }
    setLoading(true);
    setStatus('Looking at what you found');
    
    try {
      const base64Files = await Promise.all(files.map(async f => {
        return new Promise<{base64: string, mimeType: string}>((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(f.file);
          reader.onload = () => resolve({
            base64: (reader.result as string).split(',')[1],
            mimeType: f.file.type
          });
        });
      }));

      setStatus('Ensuring your privacy is protected');
      const result = await runMediaIngestionAgent(base64Files);
      setPacket(result);
    } catch (err) {
      setStatus('There was a small delay. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col space-y-12 animate-in slide-in-from-bottom-12 duration-700 pb-32">
      <header className="text-center space-y-2">
        <h2 className="text-h1 text-[#2D4739]">Sharing your path</h2>
        <p className="text-body text-[#8E8B82] max-w-sm mx-auto">
          Lay out your memories here. Atlas will review them with care before they become part of the story.
        </p>
      </header>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
           <div className="w-16 h-16 border-4 border-[#2D4739]/10 border-t-[#2D4739] rounded-full animate-spin"></div>
           <p className="text-h2 font-medium text-[#2D4739] animate-pulse">{status}</p>
        </div>
      ) : packet ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="soft-card p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-3xl">🌿</div>
            <div className="space-y-2">
               <h3 className="text-h2 text-[#2D4739]">The memories are ready</h3>
               <p className="text-body text-[#4A443F] opacity-70">
                 {packet.segments.length} moments have been added. {packet.discarded_count} items were set aside for quality.
               </p>
            </div>
            <button 
              onClick={() => onComplete(packet)}
              className="w-full py-4 btn-pine text-h2"
            >
              The specialists are ready to listen
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="soft-card p-12 border-dashed border-2 border-[#E2E8DE] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/50 transition-all"
          >
            <div className="w-16 h-16 bg-[#F9F9F7] rounded-3xl flex items-center justify-center mb-4 text-2xl">📸</div>
            <p className="text-h2 text-[#2D4739]">Share your memories</p>
            <p className="text-caption">A few photos or moments from the trail</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" accept="image/*,video/*" />
          </div>

          <div className="flex space-x-3">
            <button onClick={onCancel} className="flex-1 py-4 bg-white border border-[#E2E8DE] text-[#2D4739] font-bold rounded-2xl text-[10px] uppercase tracking-widest">Part ways for now</button>
            <button onClick={processMedia} className="flex-[2] py-4 btn-pine text-h2">Connecting the signals</button>
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {files.map((f, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-[#E2E8DE] relative">
                  <img src={f.preview} className="w-full h-full object-cover" alt="Preview" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaIngestionView;

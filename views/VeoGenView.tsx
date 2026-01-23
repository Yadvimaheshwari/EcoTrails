
import React, { useState, useRef } from 'react';
import { generateVideo } from '../geminiService';

const VeoGenView: React.FC = () => {
  const [prompt, setPrompt] = useState('An alpine forest transitioning from morning mist to clear sunlight, showing environmental change.');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setVideoUrl(null);
    setStatus('Initializing Veo Engine...');
    try {
      const base64 = previewImage ? previewImage.split(',')[1] : undefined;
      setStatus('Synthesizing frames (this may take 1-2 minutes)...');
      const url = await generateVideo(prompt, base64, aspectRatio);
      setVideoUrl(url);
    } catch (err) {
      console.error(err);
      setStatus('Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Cinematic Synthesis</h2>
        <p className="text-gray-400">Transform static observations into high-fidelity cinematic video using Veo.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-[#0f110f] border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl">
            <div>
              <label className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Starting Reference (Optional)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-video bg-black/40 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center cursor-pointer hover:border-emerald-500/30 transition-all overflow-hidden relative"
              >
                {previewImage ? (
                  <img src={previewImage} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <span className="text-xs text-gray-600">Click to upload reference frame</span>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Atmospheric Prompt</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none h-32"
                placeholder="Describe the desired cinematic evolution..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setAspectRatio('16:9')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${aspectRatio === '16:9' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-white/5'}`}
              >
                <div className="w-8 h-4 bg-gray-600 rounded mb-2"></div>
                <span className="text-[10px] font-bold">LANDSCAPE 16:9</span>
              </button>
              <button 
                onClick={() => setAspectRatio('9:16')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${aspectRatio === '9:16' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-white/5'}`}
              >
                <div className="w-4 h-8 bg-gray-600 rounded mb-2"></div>
                <span className="text-[10px] font-bold">PORTRAIT 9:16</span>
              </button>
            </div>

            <button 
              disabled={loading}
              onClick={handleGenerate}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20"
            >
              {loading ? 'Synthesizing...' : 'Generate 720p Video'}
            </button>
          </div>
        </div>

        <div className="bg-[#0f110f] border border-white/10 rounded-3xl p-4 flex flex-col items-center justify-center relative min-h-[500px] overflow-hidden">
          {loading && (
            <div className="text-center z-10 p-8 space-y-4">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-emerald-400 font-mono text-xs animate-pulse tracking-widest">{status}</p>
              <p className="text-[10px] text-gray-600 max-w-[200px]">Veo generation typically requires 60-90 seconds. Please remain on this screen.</p>
            </div>
          )}

          {!videoUrl && !loading && (
            <div className="text-center opacity-20">
              <svg className="w-24 h-24 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p>Awaiting video synthesis sequence...</p>
            </div>
          )}

          {videoUrl && (
            <video 
              src={videoUrl} 
              controls 
              autoPlay 
              loop 
              className={`max-w-full rounded-2xl shadow-2xl ${aspectRatio === '9:16' ? 'h-[600px]' : 'w-full'}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default VeoGenView;

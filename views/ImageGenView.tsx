
import React, { useState } from 'react';
import { generateImage } from '../geminiService';

const ImageGenView: React.FC = () => {
  const [prompt, setPrompt] = useState('An ultra-detailed satellite view of a regenerative farm with complex biodiversity patterns, 8k resolution, National Geographic style.');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">('1K');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const ratios = ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9"];
  const sizes = ["1K", "2K", "4K"];

  const handleGenerate = async () => {
    setLoading(true);
    setResultImage(null);
    try {
      const img = await generateImage(prompt, aspectRatio, imageSize);
      setResultImage(img);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-[#0f110f] border border-white/10 rounded-2xl p-6 shadow-xl">
             <h2 className="text-xl font-bold mb-4">Environmental Visualizer</h2>
             <div className="space-y-6">
                <div>
                   <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">Prompt</label>
                   <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm h-32 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">Aspect Ratio</label>
                   <div className="grid grid-cols-4 gap-2">
                      {ratios.map(r => (
                        <button 
                          key={r}
                          onClick={() => setAspectRatio(r)}
                          className={`py-2 text-[10px] rounded border transition-all ${aspectRatio === r ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                          {r}
                        </button>
                      ))}
                   </div>
                </div>
                <div>
                   <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">Target Resolution</label>
                   <div className="flex space-x-2">
                      {sizes.map(s => (
                        <button 
                          key={s}
                          onClick={() => setImageSize(s as any)}
                          className={`flex-1 py-2 text-[10px] rounded border transition-all ${imageSize === s ? 'bg-emerald-600 border-emerald-500 text-white font-bold' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                          {s}
                        </button>
                      ))}
                   </div>
                </div>
                <button 
                  disabled={loading}
                  onClick={handleGenerate}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold rounded-xl transition-all"
                >
                  {loading ? 'Synthesizing Visual...' : 'Generate Neural Imagery'}
                </button>
             </div>
          </div>
        </div>

        <div className="lg:w-2/3 min-h-[600px] bg-[#0f110f] border border-white/5 rounded-3xl flex items-center justify-center p-4 relative group">
           {loading ? (
             <div className="flex flex-col items-center animate-pulse">
                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                <p className="font-mono text-[10px] text-emerald-500 uppercase tracking-widest">Inference in progress</p>
             </div>
           ) : resultImage ? (
             <div className="relative w-full h-full flex items-center justify-center">
               <img src={resultImage} className="max-w-full max-h-[700px] rounded-2xl shadow-2xl object-contain transition-transform group-hover:scale-[1.01] duration-500" alt="Generated visual" />
               <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-mono">
                 {imageSize} RESOLUTION // {aspectRatio} AR
               </div>
             </div>
           ) : (
             <div className="text-center opacity-10">
                <svg className="w-32 h-32 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xl">Neural Visualizer Offline</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenView;

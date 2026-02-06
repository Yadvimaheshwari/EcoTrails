'use client';

import { useState, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface DiscoveryResult {
  primary_subject: string;
  detailed_description: string;
  ecological_context: string;
  interesting_facts: string[];
  safety_notes?: string;
  photography_tips?: string;
  confidence_score: number;
  category: string;
}

interface DiscoveryIdentifierProps {
  hikeId?: string;
  location?: { lat: number; lng: number };
  trailContext?: string;
  onDiscoveryIdentified?: (result: DiscoveryResult) => void;
}

export function DiscoveryIdentifier({ 
  hikeId, 
  location, 
  trailContext,
  onDiscoveryIdentified 
}: DiscoveryIdentifierProps) {
  const [identifying, setIdentifying] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = async (file: File) => {
    setIdentifying(true);
    setError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('image', file);
      if (location) {
        formData.append('location', JSON.stringify(location));
      }
      if (trailContext) {
        formData.append('trail_context', trailContext);
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/companion/identify`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          timeout: 30000,
        }
      );

      if (response.data.success) {
        const discoveryResult = response.data.identification;
        setResult(discoveryResult);
        onDiscoveryIdentified?.(discoveryResult);
      } else {
        setError(response.data.error || 'Failed to identify');
      }
    } catch (err: any) {
      console.error('Identification error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to identify discovery');
    } finally {
      setIdentifying(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageCapture(file);
    }
  };

  const resetIdentifier = () => {
    setResult(null);
    setImagePreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Button / Capture Area */}
      {!imagePreview && !result && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative overflow-hidden cursor-pointer rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #4F8A6B 0%, #5AB88C 100%)',
            minHeight: '300px'
          }}
        >
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
          
          <div className="relative z-10 flex flex-col items-center justify-center h-full py-16 px-8 text-white">
            <div 
              className="w-24 h-24 rounded-full mb-6 flex items-center justify-center animate-pulse"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <span className="text-5xl">🔍</span>
            </div>
            <h3 className="text-2xl font-semibold mb-3">Identify Discovery</h3>
            <p className="text-center text-white/90 mb-6 max-w-sm">
              Tap to capture a photo and let Gemini AI identify plants, animals, landmarks, and more
            </p>
            <div className="flex items-center gap-2 px-6 py-3 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <span className="text-xl">✨</span>
              <span className="font-medium">AI-Powered Recognition</span>
            </div>
          </div>
        </div>
      )}

      {/* Identifying State */}
      {identifying && imagePreview && (
        <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '2px solid #E8E8E3' }}>
          <div className="relative">
            <img 
              src={imagePreview} 
              alt="Identifying..." 
              className="w-full h-auto"
              style={{ maxHeight: '400px', objectFit: 'cover' }}
            />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-16 h-16 border-4 border-t-transparent border-white rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Analyzing with Gemini AI...</h3>
                <p className="text-white/80">Identifying species and features</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div 
          className="p-6 rounded-3xl mb-4 animate-shake"
          style={{ backgroundColor: '#FFF5F5', border: '2px solid #FED7D7' }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-red-700 mb-2">Identification Failed</h3>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                onClick={resetIdentifier}
                className="px-4 py-2 rounded-lg font-medium transition-all"
                style={{ backgroundColor: '#F56565', color: 'white' }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && imagePreview && !identifying && (
        <div 
          className="rounded-3xl overflow-hidden animate-slide-in"
          style={{ backgroundColor: '#FFFFFF', border: '2px solid #4F8A6B', boxShadow: '0 20px 60px rgba(79, 138, 107, 0.2)' }}
        >
          {/* Image with Badge */}
          <div className="relative">
            <img 
              src={imagePreview} 
              alt="Identified discovery" 
              className="w-full h-auto"
              style={{ maxHeight: '400px', objectFit: 'cover' }}
            />
            <div 
              className="absolute top-4 right-4 px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2"
              style={{ backgroundColor: 'rgba(79, 138, 107, 0.95)' }}
            >
              <span className="text-white text-sm font-semibold">
                {Math.round((result.confidence_score || 0.85) * 100)}% Match
              </span>
              <span>✓</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Primary Subject */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #4F8A6B 0%, #5AB88C 100%)' }}
                >
                  <span className="text-xl">
                    {result.category === 'plant' ? '🌿' : 
                     result.category === 'animal' ? '🦌' : 
                     result.category === 'bird' ? '🦅' :
                     result.category === 'insect' ? '🦋' :
                     result.category === 'geological' ? '🪨' : '🏔️'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-textSecondary uppercase tracking-wide font-semibold">
                    {result.category || 'Discovery'}
                  </span>
                  <h3 className="text-2xl font-bold text-text">{result.primary_subject}</h3>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 rounded-2xl" style={{ backgroundColor: '#F6F8F7' }}>
              <h4 className="font-semibold text-text mb-2">Description</h4>
              <p className="text-textSecondary leading-relaxed">{result.detailed_description}</p>
            </div>

            {/* Ecological Context */}
            {result.ecological_context && (
              <div className="p-4 rounded-2xl" style={{ backgroundColor: '#E8F4F8' }}>
                <h4 className="font-semibold text-text mb-2 flex items-center gap-2">
                  <span>🌍</span>
                  Ecological Context
                </h4>
                <p className="text-textSecondary leading-relaxed">{result.ecological_context}</p>
              </div>
            )}

            {/* Interesting Facts */}
            {result.interesting_facts && result.interesting_facts.length > 0 && (
              <div>
                <h4 className="font-semibold text-text mb-3 flex items-center gap-2">
                  <span>💡</span>
                  Interesting Facts
                </h4>
                <ul className="space-y-2">
                  {result.interesting_facts.map((fact: string, idx: number) => (
                    <li 
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-xl hover:shadow-md transition-shadow"
                      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}
                    >
                      <span className="text-amber-500 text-lg mt-0.5">⭐</span>
                      <span className="text-textSecondary flex-1">{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Safety Notes */}
            {result.safety_notes && (
              <div 
                className="p-4 rounded-2xl"
                style={{ backgroundColor: '#FFF8F0', border: '1px solid #F4A34040' }}
              >
                <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#F4A340' }}>
                  <span>⚠️</span>
                  Safety Information
                </h4>
                <p className="text-textSecondary leading-relaxed">{result.safety_notes}</p>
              </div>
            )}

            {/* Photography Tips */}
            {result.photography_tips && (
              <div className="p-4 rounded-2xl" style={{ backgroundColor: '#F0F4FF' }}>
                <h4 className="font-semibold text-text mb-2 flex items-center gap-2">
                  <span>📷</span>
                  Photography Tips
                </h4>
                <p className="text-textSecondary leading-relaxed">{result.photography_tips}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: '#E8E8E3' }}>
              <button
                onClick={resetIdentifier}
                className="flex-1 px-6 py-3 rounded-xl font-medium transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #4F8A6B 0%, #5AB88C 100%)', color: 'white' }}
              >
                Identify Another
              </button>
              {hikeId && (
                <button
                  className="px-6 py-3 rounded-xl font-medium transition-all hover:shadow-lg"
                  style={{ backgroundColor: '#F6F8F7', color: '#1B1F1E', border: '1px solid #E8E8E3' }}
                >
                  Save to Journal
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animate-slide-in {
          animation: slide-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

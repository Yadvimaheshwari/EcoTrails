'use client';

import { useState, useEffect } from 'react';
import { 
  generateHikeStory, 
  organizePhotos, 
  getPredictiveInsights, 
  enhancePhotoWithNanoBanana,
  generateTrailVideo 
} from '@/lib/aiServices';
import { AnimatedCard } from './AnimatedCard';

interface AIFeaturesHubProps {
  hikeId?: string;
  userId?: string;
  onFeatureComplete?: (feature: string, result: any) => void;
}

export function AIFeaturesHub({ hikeId, userId, onFeatureComplete }: AIFeaturesHubProps) {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [results, setResults] = useState<{ [key: string]: any }>({});
  const [error, setError] = useState<string | null>(null);

  const features = [
    {
      id: 'story',
      icon: '📖',
      title: 'Generate AI Story',
      description: 'Transform your hike into a beautifully written narrative',
      color: '#4C7EF3',
      gradient: 'linear-gradient(135deg, #4C7EF3 0%, #7B68EE 100%)',
      available: !!hikeId,
      action: async () => {
        if (!hikeId) return;
        setLoading({ ...loading, story: true });
        setError(null);
        try {
          const result = await generateHikeStory(hikeId, 'narrative');
          setResults({ ...results, story: result });
          onFeatureComplete?.('story', result);
        } catch (err: any) {
          setError(err.message || 'Failed to generate story');
        } finally {
          setLoading({ ...loading, story: false });
        }
      }
    },
    {
      id: 'photos',
      icon: '📸',
      title: 'Organize Photos',
      description: 'AI automatically creates smart albums from your hike photos',
      color: '#4F8A6B',
      gradient: 'linear-gradient(135deg, #4F8A6B 0%, #5AB88C 100%)',
      available: !!hikeId,
      action: async () => {
        if (!hikeId) return;
        setLoading({ ...loading, photos: true });
        setError(null);
        try {
          const result = await organizePhotos(hikeId);
          setResults({ ...results, photos: result });
          onFeatureComplete?.('photos', result);
        } catch (err: any) {
          setError(err.message || 'Failed to organize photos');
        } finally {
          setLoading({ ...loading, photos: false });
        }
      }
    },
    {
      id: 'insights',
      icon: '🔮',
      title: 'Predictive Insights',
      description: 'Discover patterns and get personalized trail recommendations',
      color: '#F4A340',
      gradient: 'linear-gradient(135deg, #F4A340 0%, #FF6B6B 100%)',
      available: !!userId,
      action: async () => {
        if (!userId) return;
        setLoading({ ...loading, insights: true });
        setError(null);
        try {
          const result = await getPredictiveInsights(userId);
          setResults({ ...results, insights: result });
          onFeatureComplete?.('insights', result);
        } catch (err: any) {
          setError(err.message || 'Failed to get insights');
        } finally {
          setLoading({ ...loading, insights: false });
        }
      }
    },
    {
      id: 'video',
      icon: '🎬',
      title: 'Create Trail Video',
      description: 'Generate a cinematic video from your hike with AI narration',
      color: '#9B51E0',
      gradient: 'linear-gradient(135deg, #9B51E0 0%, #F093FB 100%)',
      available: !!hikeId,
      action: async () => {
        if (!hikeId) return;
        setLoading({ ...loading, video: true });
        setError(null);
        try {
          const result = await generateTrailVideo(hikeId, {
            style: 'cinematic',
            duration: 60,
            include_narration: true,
            include_stats_overlay: true
          });
          setResults({ ...results, video: result });
          onFeatureComplete?.('video', result);
        } catch (err: any) {
          setError(err.message || 'Failed to generate video');
        } finally {
          setLoading({ ...loading, video: false });
        }
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Gemini Branding */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4C7EF3 0%, #4F8A6B 100%)' }}
          >
            <span className="text-2xl">✨</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-text">AI-Powered Features</h2>
            <p className="text-sm text-textSecondary">Powered by Gemini</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div 
          className="p-4 rounded-xl border animate-shake"
          style={{ backgroundColor: '#FFF5F5', borderColor: '#FED7D7', color: '#C53030' }}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="font-semibold mb-1">Error</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <AnimatedCard 
            key={feature.id}
            delay={index * 100}
            className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${
              !feature.available ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-xl'
            }`}
            onClick={() => {
              if (feature.available && !loading[feature.id]) {
                setActiveFeature(feature.id);
                feature.action();
              }
            }}
          >
            {/* Gradient Background */}
            <div 
              className="absolute inset-0 opacity-10 transition-opacity duration-300 group-hover:opacity-20"
              style={{ background: feature.gradient }}
            />
            
            {/* Content */}
            <div className="relative z-10 p-6">
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transform transition-transform duration-300 hover:scale-110"
                  style={{ background: feature.gradient }}
                >
                  {feature.icon}
                </div>
                
                {loading[feature.id] && (
                  <div 
                    className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: feature.color, borderTopColor: 'transparent' }}
                  />
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-text mb-2">{feature.title}</h3>
              <p className="text-sm text-textSecondary mb-4">{feature.description}</p>
              
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span 
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: feature.available ? `${feature.color}20` : '#E8E8E3',
                    color: feature.available ? feature.color : '#999'
                  }}
                >
                  {loading[feature.id] ? 'Generating...' : results[feature.id] ? 'Complete ✓' : 'Ready'}
                </span>
                
                {feature.available && !loading[feature.id] && (
                  <button
                    className="px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:shadow-lg active:scale-95"
                    style={{ background: feature.gradient }}
                  >
                    {results[feature.id] ? 'Regenerate' : 'Generate'}
                  </button>
                )}
              </div>
            </div>
            
            {/* Shimmer Effect on Hover */}
            <div 
              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)`,
                transform: 'translateX(-100%)',
                animation: 'shimmer 2s infinite'
              }}
            />
          </AnimatedCard>
        ))}
      </div>

      {/* Results Display */}
      {Object.keys(results).length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-semibold text-text">Generated Content</h3>
          
          {results.story && (
            <AnimatedCard delay={0} className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl">📖</span>
                <div>
                  <h4 className="font-semibold text-lg mb-2">Your AI-Generated Story</h4>
                  <div className="prose max-w-none">
                    <p className="text-textSecondary leading-relaxed whitespace-pre-wrap">
                      {results.story.story}
                    </p>
                  </div>
                  
                  {results.story.highlights && results.story.highlights.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <h5 className="font-semibold mb-3">Key Highlights</h5>
                      <ul className="space-y-2">
                        {results.story.highlights.map((highlight: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-500 mt-1">⭐</span>
                            <span className="text-textSecondary">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </AnimatedCard>
          )}
          
          {results.photos && results.photos.albums && (
            <AnimatedCard delay={100} className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl">📸</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-4">Smart Photo Albums</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {results.photos.albums.map((album: any, idx: number) => (
                      <div 
                        key={idx}
                        className="p-4 rounded-xl border hover:shadow-lg transition-shadow"
                        style={{ borderColor: '#E8E8E3' }}
                      >
                        <h5 className="font-semibold mb-2">{album.name}</h5>
                        <p className="text-sm text-textSecondary mb-2">{album.theme}</p>
                        <span className="text-xs text-textSecondary">{album.photos.length} photos</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedCard>
          )}
          
          {results.insights && (
            <AnimatedCard delay={200} className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl">🔮</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-4">Your Insights</h4>
                  
                  {results.insights.patterns && results.insights.patterns.length > 0 && (
                    <div className="mb-6">
                      <h5 className="font-semibold mb-3">Patterns Discovered</h5>
                      <div className="space-y-3">
                        {results.insights.patterns.map((pattern: any, idx: number) => (
                          <div 
                            key={idx}
                            className="p-4 rounded-lg"
                            style={{ backgroundColor: '#F6F8F7' }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{pattern.pattern}</span>
                              <span 
                                className="px-2 py-1 rounded text-xs font-medium"
                                style={{ backgroundColor: '#4F8A6B', color: 'white' }}
                              >
                                {Math.round(pattern.confidence * 100)}% confidence
                              </span>
                            </div>
                            <p className="text-sm text-textSecondary">{pattern.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {results.insights.recommendations && results.insights.recommendations.length > 0 && (
                    <div>
                      <h5 className="font-semibold mb-3">Recommended Trails</h5>
                      <div className="space-y-2">
                        {results.insights.recommendations.map((rec: any, idx: number) => (
                          <div 
                            key={idx}
                            className="p-3 rounded-lg flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
                            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">{rec.reason}</p>
                            </div>
                            <span 
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{ backgroundColor: '#4C7EF3', color: 'white' }}
                            >
                              {Math.round(rec.match_score * 100)}% match
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </AnimatedCard>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animate-slide-in {
          animation: slideIn 0.6s ease-out forwards;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

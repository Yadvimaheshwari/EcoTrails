'use client';

import { useState, useEffect } from 'react';
import { AnimatedCard } from './AnimatedCard';
import { 
  generateHikeStory, 
  organizePhotos, 
  getPredictiveInsights,
  searchJournal,
  enhancePhotoWithNanoBanana,
  generateTrailVideo
} from '@/lib/aiServices';
import { useAuth } from '@/contexts/AuthContext';

interface IntelligentJournalProps {
  hikeId: string;
  hike: any;
  onStoryGenerated?: (story: any) => void;
}

export function IntelligentJournal({ hikeId, hike, onStoryGenerated }: IntelligentJournalProps) {
  const { user } = useAuth();
  const [story, setStory] = useState<any>(null);
  const [organizedPhotos, setOrganizedPhotos] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [enhancingPhoto, setEnhancingPhoto] = useState<string | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);

  useEffect(() => {
    if (hikeId && hike) {
      loadIntelligentFeatures();
    }
  }, [hikeId, hike]);

  const loadIntelligentFeatures = async () => {
    setLoading(true);
    try {
      // Load story, photos, and insights in parallel
      const [storyData, photosData, insightsData] = await Promise.all([
        generateHikeStory(hikeId).catch(() => null),
        organizePhotos(hikeId).catch(() => null),
        user ? getPredictiveInsights(user.id).catch(() => null) : Promise.resolve(null),
      ]);

      if (storyData) {
        setStory(storyData);
        onStoryGenerated?.(storyData);
      }
      if (photosData) setOrganizedPhotos(photosData);
      if (insightsData) setInsights(insightsData);
    } catch (error) {
      console.error('Failed to load intelligent features:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      const results = await searchJournal(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleEnhancePhoto = async (photoUrl: string) => {
    setEnhancingPhoto(photoUrl);
    try {
      // Convert URL to File (in production, you'd fetch the file properly)
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });

      const enhanced = await enhancePhotoWithNanoBanana(file, {
        lighting: 'golden-hour',
        style: 'cinematic',
        enhance_subject: true,
      });

      // Update photo in UI
      console.log('Photo enhanced:', enhanced);
    } catch (error) {
      console.error('Photo enhancement failed:', error);
    } finally {
      setEnhancingPhoto(null);
    }
  };

  const handleGenerateVideo = async () => {
    setGeneratingVideo(true);
    try {
      const video = await generateTrailVideo(hikeId, {
        style: 'cinematic',
        duration: 60,
        include_narration: true,
        include_stats_overlay: true,
      });
      console.log('Video generated:', video);
      // Show video in modal or navigate to video page
    } catch (error) {
      console.error('Video generation failed:', error);
    } finally {
      setGeneratingVideo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Story Section */}
      {story && (
        <AnimatedCard delay={0} className="card">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-semibold gradient-text">✨ Gemini AI Story</h3>
              <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: '#4C7EF3', color: 'white' }}>
                AI-Powered
              </span>
            </div>
            <select
              className="px-3 py-1 rounded-lg text-sm border border-gray-300"
              onChange={(e) => {
                const style = e.target.value as any;
                generateHikeStory(hikeId, style).then(setStory);
              }}
            >
              <option value="narrative">Narrative</option>
              <option value="poetic">Poetic</option>
              <option value="adventure">Adventure</option>
              <option value="reflective">Reflective</option>
            </select>
          </div>
          
          <div className="prose max-w-none">
            <p className="text-textSecondary leading-relaxed whitespace-pre-wrap">
              {story.story}
            </p>
          </div>

          {story.highlights && story.highlights.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-semibold mb-3">Key Highlights</h4>
              <ul className="space-y-2">
                {story.highlights.map((highlight: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">⭐</span>
                    <span className="text-textSecondary">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {story.emotional_journey && story.emotional_journey.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-semibold mb-3">Emotional Journey</h4>
              <div className="space-y-3">
                {story.emotional_journey.map((moment: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-4F8A6B mt-2" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text">{moment.time}</div>
                      <div className="text-sm text-textSecondary">{moment.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AnimatedCard>
      )}

      {/* Smart Photo Organization */}
      {organizedPhotos && organizedPhotos.albums && organizedPhotos.albums.length > 0 && (
        <AnimatedCard delay={100} className="card">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-2xl font-semibold">✨ Gemini Smart Photo Albums</h3>
            <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: '#4F8A6B', color: 'white' }}>
              AI Organized
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {organizedPhotos.albums.map((album: any, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-gray-200 hover:border-4F8A6B transition-colors"
              >
                <h4 className="font-semibold mb-2">{album.name}</h4>
                <p className="text-sm text-textSecondary mb-3">{album.theme}</p>
                <div className="grid grid-cols-3 gap-2">
                  {album.photos.slice(0, 3).map((photo: string, pIdx: number) => (
                    <div
                      key={pIdx}
                      className="aspect-square rounded-lg overflow-hidden bg-gray-200"
                      style={{
                        backgroundImage: `url(${photo})`,
                        backgroundSize: 'cover',
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AnimatedCard>
      )}

      {/* Predictive Insights */}
      {insights && (
        <AnimatedCard delay={200} className="card">
          <h3 className="text-2xl font-semibold mb-4">Predictive Insights</h3>
          
          {insights.patterns && insights.patterns.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Your Hiking Patterns</h4>
              <div className="space-y-3">
                {insights.patterns.map((pattern: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{pattern.pattern}</span>
                      <span className="text-sm text-textSecondary">
                        {Math.round(pattern.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-textSecondary">{pattern.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.recommendations && insights.recommendations.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Trail Recommendations</h4>
              <div className="space-y-2">
                {insights.recommendations.slice(0, 3).map((rec: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Trail {rec.trail_id}</span>
                      <span className="text-sm text-4F8A6B">
                        {Math.round(rec.match_score * 100)}% match
                      </span>
                    </div>
                    <p className="text-sm text-textSecondary mt-1">{rec.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.skill_development && (
            <div className="p-4 rounded-lg bg-gradient-to-r from-4F8A6B/10 to-F4A340/10">
              <h4 className="font-semibold mb-2">Skill Development</h4>
              <div className="mb-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Current: {insights.skill_development.current_level}</span>
                  <span>{insights.skill_development.progress_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-4F8A6B h-2 rounded-full transition-all duration-500"
                    style={{ width: `${insights.skill_development.progress_percentage}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-textSecondary">
                Next milestone: {insights.skill_development.next_milestone}
              </p>
            </div>
          )}
        </AnimatedCard>
      )}

      {/* Natural Language Search */}
      <AnimatedCard delay={300} className="card">
        <h3 className="text-2xl font-semibold mb-4">Search Your Journal</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            placeholder="Search for hikes with waterfalls in summer..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-4F8A6B"
          />
        </div>
        
        {searchResults && (
          <div className="mt-4 space-y-2">
            {searchResults.results.map((result: any, idx: number) => (
              <div key={idx} className="p-3 rounded-lg bg-gray-50">
                <div className="font-medium">Hike {result.hike_id}</div>
                <div className="text-sm text-textSecondary">
                  Relevance: {Math.round(result.relevance_score * 100)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </AnimatedCard>

      {/* AI Actions */}
      <AnimatedCard delay={400} className="card">
        <h3 className="text-2xl font-semibold mb-4">AI Enhancements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleGenerateVideo}
            disabled={generatingVideo}
            className="p-4 rounded-xl border border-gray-200 hover:border-4F8A6B transition-colors text-left disabled:opacity-50"
          >
            <div className="text-2xl mb-2">🎬</div>
            <div className="font-semibold">Generate Trail Video</div>
            <div className="text-sm text-textSecondary">
              {generatingVideo ? 'Generating...' : 'Create cinematic recap video'}
            </div>
          </button>

          <button
            onClick={loadIntelligentFeatures}
            disabled={loading}
            className="p-4 rounded-xl border border-gray-200 hover:border-4F8A6B transition-colors text-left disabled:opacity-50"
          >
            <div className="text-2xl mb-2">✨</div>
            <div className="font-semibold">Regenerate Insights</div>
            <div className="text-sm text-textSecondary">
              {loading ? 'Loading...' : 'Refresh AI analysis'}
            </div>
          </button>
        </div>
      </AnimatedCard>
    </div>
  );
}

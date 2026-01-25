/**
 * Trail Detail View
 * Shows comprehensive trail information and allows starting a hike
 * Matches mobile app's TrailDetailScreen functionality
 */
import React, { useState, useEffect } from 'react';
import { Park, US_PARKS } from '../data/parks';

interface TrailDetailViewProps {
  trailId: string;
  onBack?: () => void;
  onStartHike?: (trailId: string, parkId: string) => void;
}

// Mock trail data generator (matches mobile app's ApiService)
const generateMockTrail = (trailId: string): any => {
  // Parse trail ID to extract park ID
  const parts = trailId.split('-');
  const parkId = parts.slice(1, -1).join('-');
  const park = US_PARKS.find(p => p.id === parkId);
  
  const difficulties = ['easy', 'moderate', 'hard', 'expert'];
  const routeTypes = ['out-and-back', 'loop', 'point-to-point'];
  const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
  const length_miles = 2 + Math.random() * 10;
  const elevation_gain_ft = 200 + Math.random() * 3000;
  
  return {
    id: trailId,
    park_id: parkId,
    name: `${park?.name || 'Park'} ${['Main Trail', 'Summit Trail', 'Loop Trail', 'Waterfall Trail', 'Scenic Overlook'][Math.floor(Math.random() * 5)]}`,
    description: `A beautiful trail in ${park?.name || 'the park'} with scenic views and diverse terrain. This trail offers stunning vistas, diverse wildlife, and challenging sections that make it a favorite among hikers.`,
    difficulty,
    length_miles: Math.round(length_miles * 10) / 10,
    elevation_gain_ft: Math.round(elevation_gain_ft),
    estimated_duration_hours: Math.round((length_miles / 2.5) * 10) / 10,
    route_type: routeTypes[Math.floor(Math.random() * routeTypes.length)],
    rating: 4 + Math.random(),
    review_count: Math.floor(Math.random() * 100) + 10,
    park_name: park?.name || 'Unknown Park',
  };
};

// Mock reviews
const generateMockReviews = (count: number) => {
  const names = ['Sarah M.', 'John D.', 'Emily R.', 'Mike T.', 'Lisa K.', 'David P.', 'Anna W.', 'Chris B.'];
  const comments = [
    'Amazing views! Highly recommend.',
    'Challenging but rewarding trail.',
    'Great for a day hike.',
    'Beautiful scenery throughout.',
    'Well-maintained trail.',
    'Perfect for intermediate hikers.',
    'Stunning vistas at the summit.',
    'Moderate difficulty, great workout.',
  ];
  
  return Array.from({ length: Math.min(count, 8) }, (_, i) => ({
    id: `review-${i}`,
    author: names[i % names.length],
    rating: 4 + Math.random(),
    comment: comments[i % comments.length],
    date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  }));
};

const TrailDetailView: React.FC<TrailDetailViewProps> = ({ trailId, onBack, onStartHike }) => {
  const [trail, setTrail] = useState<any | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hikeState, setHikeState] = useState<'idle' | 'confirming' | 'countdown' | 'creating' | 'error'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (trailId) {
      loadTrailDetail();
    } else {
      setError('Trail ID is required');
      setLoading(false);
    }
  }, [trailId]);

  // Countdown effect
  useEffect(() => {
    if (hikeState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (hikeState === 'countdown' && countdown === 0) {
      handleCreateSession();
    }
  }, [hikeState, countdown]);

  const loadTrailDetail = () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!trailId) {
        throw new Error('Trail ID is required');
      }
      
      const trailData = generateMockTrail(trailId);
      
      if (!trailData.park_id) {
        throw new Error('Trail is missing park_id. Cannot start hike.');
      }
      
      setTrail(trailData);
      setReviews(generateMockReviews(trailData.review_count || 10));
    } catch (err: any) {
      setError(err.message || 'Failed to load trail details');
      console.error('Error loading trail detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrail = () => {
    if (!trail) {
      alert('Error: Trail information not loaded');
      return;
    }

    if (!trail.park_id) {
      alert('Error: Trail is missing park information. Cannot start hike.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmStart = () => {
    setShowConfirmModal(false);
    setHikeState('countdown');
    setCountdown(3);
  };

  const handleCreateSession = async () => {
    if (!trail || !trail.park_id) {
      setHikeState('error');
      return;
    }

    setHikeState('creating');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Call onStartHike callback
      if (onStartHike) {
        onStartHike(trail.id, trail.park_id);
      } else {
        alert('Hike session created! (Navigation not configured)');
        setHikeState('idle');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create hike session');
      setHikeState('error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#2D4739]/20 border-t-[#2D4739] rounded-full animate-spin mx-auto"></div>
          <p className="text-[#8E8B82]">Loading trail details...</p>
        </div>
      </div>
    );
  }

  if (error || !trail) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold text-[#2D4739]">Unable to load trail</h2>
          <p className="text-[#8E8B82]">{error || 'Trail not found'}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 bg-[#2D4739] text-white rounded-xl font-semibold hover:bg-[#1A2C23] transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  const difficultyColors = {
    easy: 'bg-green-500',
    moderate: 'bg-orange-500',
    hard: 'bg-red-500',
    expert: 'bg-purple-500',
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7] pb-32">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8DE] px-6 pt-16 pb-6">
        <div className="max-w-4xl mx-auto">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 text-[#2D4739] hover:text-[#1A2C23] transition-colors"
            >
              ← Back
            </button>
          )}
          <h1 className="text-4xl font-bold text-[#2D4739] mb-2">{trail.name}</h1>
          <p className="text-lg text-[#8E8B82]">{trail.park_name}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Trail Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#E2E8DE]">
            <p className="text-xs text-[#8E8B82] uppercase tracking-wide mb-1">Distance</p>
            <p className="text-lg font-bold text-[#2D4739]">{trail.length_miles.toFixed(1)} mi</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#E2E8DE]">
            <p className="text-xs text-[#8E8B82] uppercase tracking-wide mb-1">Elevation</p>
            <p className="text-lg font-bold text-[#2D4739]">{trail.elevation_gain_ft} ft</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#E2E8DE]">
            <p className="text-xs text-[#8E8B82] uppercase tracking-wide mb-1">Duration</p>
            <p className="text-lg font-bold text-[#2D4739]">~{trail.estimated_duration_hours.toFixed(1)} hrs</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#E2E8DE]">
            <p className="text-xs text-[#8E8B82] uppercase tracking-wide mb-1">Difficulty</p>
            <div className={`inline-block px-3 py-1 rounded-lg text-xs font-bold text-white ${difficultyColors[trail.difficulty as keyof typeof difficultyColors] || 'bg-gray-500'}`}>
              {trail.difficulty.toUpperCase()}
            </div>
          </div>
        </section>

        {/* Description */}
        {trail.description && (
          <section>
            <h2 className="text-xl font-semibold text-[#2D4739] mb-4">About</h2>
            <p className="text-[#2D4739] leading-relaxed">{trail.description}</p>
          </section>
        )}

        {/* Map Preview Placeholder */}
        <section>
          <h2 className="text-xl font-semibold text-[#2D4739] mb-4">Trail Map</h2>
          <div className="bg-white p-12 rounded-xl border border-[#E2E8DE] text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-[#8E8B82]">Map preview coming soon</p>
          </div>
        </section>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#2D4739]">
                Reviews ({trail.review_count})
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-2xl">⭐</span>
                <span className="text-lg font-bold text-[#2D4739]">{trail.rating.toFixed(1)}</span>
              </div>
            </div>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white p-6 rounded-xl border border-[#E2E8DE]">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-[#2D4739]">{review.author}</p>
                      <p className="text-xs text-[#8E8B82]">{review.date}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-sm font-medium text-[#2D4739]">{review.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-[#2D4739]">{review.comment}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Start Trail Button */}
        <section className="pt-8">
          <button
            onClick={handleStartTrail}
            disabled={hikeState !== 'idle'}
            className="w-full py-5 bg-[#2D4739] text-white rounded-[24px] text-xl font-bold shadow-2xl hover:bg-[#1A2C23] transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hikeState === 'idle' && 'Start Trail'}
            {hikeState === 'confirming' && 'Confirming...'}
            {hikeState === 'countdown' && `Starting in ${countdown}...`}
            {hikeState === 'creating' && 'Creating session...'}
            {hikeState === 'error' && 'Error - Try Again'}
          </button>
        </section>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full space-y-6">
            <h3 className="text-2xl font-bold text-[#2D4739]">Start this hike now?</h3>
            <p className="text-[#8E8B82]">
              You're about to start recording your hike on <strong>{trail.name}</strong>. Make sure you're ready to begin!
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-6 py-3 border border-[#E2E8DE] rounded-xl text-[#2D4739] font-semibold hover:bg-[#F9F9F7] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStart}
                className="flex-1 px-6 py-3 bg-[#2D4739] text-white rounded-xl font-semibold hover:bg-[#1A2C23] transition-colors"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrailDetailView;

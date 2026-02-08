'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getHike } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { TerrainViewer } from '@/components/TerrainViewer';

export default function TerrainPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [hike, setHike] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeSlider, setTimeSlider] = useState(0.5);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && params.id) {
      loadHike();
    }
  }, [user, isLoading, params.id, router]);

  const loadHike = async () => {
    try {
      const response = await getHike(params.id as string);
      setHike(response.data.data);
    } catch (error) {
      console.error('Failed to load hike:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !user || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!hike) {
    return <div className="min-h-screen flex items-center justify-center">Hike not found</div>;
  }

  const routePoints = hike.route || [];
  const insights = hike.insights || {};

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-textSecondary hover:text-text mb-4"
        >
          ← Back
        </button>
        <h1 className="text-4xl font-bold mb-2">3D Terrain</h1>
        <p className="text-xl text-textSecondary">{hike.name || 'Unnamed Hike'}</p>
      </div>

      <div className="card mb-8" style={{ height: '600px' }}>
        <TerrainViewer
          routePoints={routePoints}
          insights={insights}
          timeProgress={timeSlider}
        />
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Time Slider</h3>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={timeSlider}
          onChange={(e) => setTimeSlider(parseFloat(e.target.value))}
          className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <p className="text-textSecondary text-center mt-2">
          {Math.round(timeSlider * 100)}% of hike
        </p>
      </div>
    </div>
  );
}

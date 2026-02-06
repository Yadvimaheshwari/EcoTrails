'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getPlace,
  getPlaceWeather,
  getPlaceAlerts,
  getPlaceTrails,
  favoritePlace,
  unfavoritePlace,
  checkFavorite,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { TrailCard } from '@/components/trails/TrailCard';
import { TrailFilters, TrailFilterState } from '@/components/trails/TrailFilters';
import { TrailDetailPanel } from '@/components/trails/TrailDetailPanel';
import {
  MapPin,
  Star,
  Cloud,
  Calendar,
  FileText,
  AlertTriangle,
  PawPrint,
  Map as MapIcon,
  Heart,
  Bookmark,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function NationalParkPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  // State
  const [place, setPlace] = useState<any>(null);
  const [trails, setTrails] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // UI State
  const [selectedTrail, setSelectedTrail] = useState<any>(null);
  const [showMap, setShowMap] = useState(true);
  const [expandedIntel, setExpandedIntel] = useState<string | null>(null);
  
  // Filter State
  const [filters, setFilters] = useState<TrailFilterState>({
    difficulty: [],
    distanceRange: [0, 50],
    elevationRange: [0, 5000],
    loopType: [],
    timeRange: [0, 8],
  });

  // Load data
  useEffect(() => {
    loadParkData();
  }, [params.id, user]);

  const loadParkData = async () => {
    try {
      const placeId = params.id as string;
      
      // Load park details
      const placeResponse = await getPlace(placeId);
      setPlace(placeResponse.data);

      // Load trails
      const trailsResponse = await getPlaceTrails(placeId);
      setTrails(trailsResponse.data.trails || []);

      // Load weather
      try {
        const weatherResponse = await getPlaceWeather(placeId);
        setWeather(weatherResponse.data);
      } catch (err) {
        console.error('Weather load failed:', err);
      }

      // Load alerts
      try {
        const alertsResponse = await getPlaceAlerts(placeId);
        setAlerts(alertsResponse.data.alerts || []);
      } catch (err) {
        console.error('Alerts load failed:', err);
      }

      // Check if favorited
      if (user) {
        try {
          const favResponse = await checkFavorite(placeId);
          setIsFavorite(favResponse.data.is_favorite);
        } catch (err) {
          console.error('Favorite check failed:', err);
        }
      }
    } catch (error) {
      console.error('Failed to load park data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter trails
  const filteredTrails = trails.filter((trail) => {
    // Difficulty filter
    if (
      filters.difficulty.length > 0 &&
      !filters.difficulty.includes(trail.difficulty?.toLowerCase())
    ) {
      return false;
    }

    // Distance filter
    const distance = trail.distance || 0;
    if (distance < filters.distanceRange[0] || distance > filters.distanceRange[1]) {
      return false;
    }

    // Elevation filter
    const elevation = trail.elevationGain || 0;
    if (
      elevation < filters.elevationRange[0] ||
      elevation > filters.elevationRange[1]
    ) {
      return false;
    }

    // Loop type filter
    if (filters.loopType.length > 0) {
      const trailType = trail.loopType?.toLowerCase().replace(/\s+/g, '_');
      if (!filters.loopType.includes(trailType)) {
        return false;
      }
    }

    return true;
  });

  const handleFavoriteToggle = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      if (isFavorite) {
        await unfavoritePlace(params.id as string);
        setIsFavorite(false);
      } else {
        await favoritePlace(params.id as string);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleTrailSelect = (trail: any) => {
    setSelectedTrail(trail);
  };

  const handleStartHike = () => {
    if (selectedTrail) {
      router.push(`/hikes/new?trailId=${selectedTrail.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Park not found</h1>
          <button
            onClick={() => router.push('/explore')}
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            Return to explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Park Overview Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-slate-900 mb-2">{place.name}</h1>
              <div className="flex items-center gap-3 text-slate-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {place.location || 'United States'}
                </span>
                {place.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {place.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            
            {/* Favorite Button */}
            <button
              onClick={handleFavoriteToggle}
              className={`p-3 rounded-lg transition-colors ${
                isFavorite
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-slate-500">Trails: </span>
              <span className="font-semibold text-slate-800">{trails.length}</span>
            </div>
            <div>
              <span className="text-slate-500">Total Miles: </span>
              <span className="font-semibold text-slate-800">
                {trails.reduce((sum, t) => sum + (t.distance || 0), 0).toFixed(1)}
              </span>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex gap-3 mt-4">
            <button className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold">
              View Trails
            </button>
            <button className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-semibold">
              Start Hike
            </button>
            <button className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
              <Bookmark className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Park Intelligence Summary */}
        <section className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Weather */}
            {weather && (
              <button
                onClick={() =>
                  setExpandedIntel(expandedIntel === 'weather' ? null : 'weather')
                }
                className="bg-white rounded-xl p-4 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-slate-800">Weather</span>
                  </div>
                  {expandedIntel === 'weather' ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                {expandedIntel === 'weather' ? (
                  <div className="text-sm text-slate-700 space-y-1">
                    <p>{weather.temperature}°F</p>
                    <p>{weather.conditions}</p>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-slate-800">
                    {weather.temperature}°F
                  </p>
                )}
              </button>
            )}

            {/* Best Season */}
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-slate-800">Best Season</span>
              </div>
              <p className="text-sm text-slate-700">Apr – Oct</p>
            </div>

            {/* Permits */}
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-slate-800">Permits</span>
              </div>
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                Required
              </span>
            </div>

            {/* Alerts */}
            <button
              onClick={() =>
                setExpandedIntel(expandedIntel === 'alerts' ? null : 'alerts')
              }
              className="bg-white rounded-xl p-4 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-slate-800">Alerts</span>
                </div>
                {expandedIntel === 'alerts' ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </div>
              {expandedIntel === 'alerts' && alerts.length > 0 ? (
                <div className="text-sm text-slate-700 space-y-1">
                  {alerts.map((alert, idx) => (
                    <p key={idx}>• {alert.title || alert.description}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-700">
                  {alerts.length > 0 ? `${alerts.length} active` : 'None'}
                </p>
              )}
            </button>
          </div>
        </section>

        {/* Trails Explorer Section */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Trails</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Filters + Trail List */}
            <div className="lg:col-span-5 space-y-4">
              {/* Filters */}
              <TrailFilters
                filters={filters}
                onChange={setFilters}
                trailCount={filteredTrails.length}
              />

              {/* Trail Cards */}
              <div className="space-y-3">
                {filteredTrails.length > 0 ? (
                  filteredTrails.map((trail) => (
                    <TrailCard
                      key={trail.id}
                      trail={{
                        id: trail.id,
                        name: trail.name,
                        difficulty: trail.difficulty || 'moderate',
                        distance: trail.distance || 0,
                        elevationGain: trail.elevationGain || 0,
                        estimatedTime: trail.estimatedTime || 2,
                        loopType: trail.loopType,
                        surface: trail.surface,
                        tags: trail.tags,
                      }}
                      onClick={() => handleTrailSelect(trail)}
                    />
                  ))
                ) : (
                  <div className="bg-white rounded-xl p-8 text-center">
                    <p className="text-slate-600">No trails match your filters</p>
                    <button
                      onClick={() =>
                        setFilters({
                          difficulty: [],
                          distanceRange: [0, 50],
                          elevationRange: [0, 5000],
                          loopType: [],
                          timeRange: [0, 8],
                        })
                      }
                      className="mt-3 text-orange-600 hover:text-orange-700 font-medium text-sm"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Interactive Map */}
            <div className="lg:col-span-7 hidden lg:block">
              <div className="sticky top-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <MapIcon className="w-5 h-5 text-orange-600" />
                      Trail Map
                    </h3>
                    <button
                      onClick={() => setShowMap(!showMap)}
                      className="text-sm text-slate-600 hover:text-slate-800"
                    >
                      {showMap ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {showMap && (
                    <div className="aspect-square bg-slate-100 flex items-center justify-center">
                      <MapIcon className="w-16 h-16 text-slate-300" />
                      <span className="ml-3 text-slate-500">Interactive map placeholder</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Trail Detail Panel */}
      {selectedTrail && (
        <TrailDetailPanel
          trail={{
            ...selectedTrail,
            conditions: weather
              ? {
                  weather: weather.conditions,
                  temperature: weather.temperature,
                  wind: weather.wind || 'Light',
                  alerts: alerts.map((a) => a.title || a.description),
                }
              : undefined,
            wildlife: ['Deer', 'Eagles', 'Chipmunks'],
            vegetation: ['Pine Forest', 'Wildflowers', 'Oak Trees'],
            geology: ['Granite Formations', 'Glacial Valleys'],
            history: ['Historic Trail', 'Native American Sites'],
            safety: [
              'Bring plenty of water',
              'Watch for loose rocks',
              'Check weather before starting',
            ],
            recentActivity: [
              {
                date: new Date().toISOString(),
                user: 'Sarah K.',
                note: 'Great hike! Trail conditions were excellent.',
              },
            ],
          }}
          onClose={() => setSelectedTrail(null)}
          onStartHike={handleStartHike}
        />
      )}
    </div>
  );
}

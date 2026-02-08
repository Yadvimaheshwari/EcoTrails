'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getPlace,
  getPlaceWeather,
  getPlaceAlerts,
  getPlaceTrails,
  favoritePlace,
  unfavoritePlace,
  checkFavorite,
  createHike,
} from '@/lib/api';
import { downloadOfflineMapPdf } from '@/lib/offlineMap/downloadOfflineMapPdf';
import { useAuth } from '@/contexts/AuthContext';
import { TrailCard } from '@/components/trails/TrailCard';
import { TrailFilters, TrailFilterState } from '@/components/trails/TrailFilters';
import { TrailSelectSheet } from '@/components/trails/TrailSelectSheet';
import { transformTrails, extractTrailsFromResponse, FrontendTrail, TrailsResponseMeta } from '@/lib/trailTransform';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TrailMap } from '@/components/map/TrailMap';
import { formatMiles, formatFeet, formatDuration } from '@/lib/formatting';
import {
  MapPin,
  Star,
  Cloud,
  Calendar,
  FileText,
  AlertTriangle,
  Map as MapIcon,
  Heart,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  Download,
  CheckCircle,
  Loader2,
  Clock,
  TrendingUp,
  Footprints,
} from 'lucide-react';

// ============================================
// UI MODE STATE MACHINE
// ============================================
// Simplified: Park overview with bottom sheet for trail selection
type ParkUIMode = 'PARK_OVERVIEW';

// Safe location string extraction
function getLocationString(place: any): string {
  if (!place) return 'United States';
  if (typeof place.location === 'string') return place.location;
  if (place.address) return place.address;
  if (place.state) return place.state;
  if (place.vicinity) return place.vicinity;
  if (place.description) return place.description;
  if (place.location && typeof place.location === 'object') return place.country || 'United States';
  return 'United States';
}

// Offline map download states
type OfflineMapStatus = 'not_downloaded' | 'downloading' | 'ready' | 'failed';

// Difficulty badge colors
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  hard: 'bg-orange-100 text-orange-700 border-orange-200',
  expert: 'bg-red-100 text-red-700 border-red-200',
  unknown: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function NationalParkPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const placeId = params.id as string;
  
  // Validate placeId on mount
  useEffect(() => {
    if (!placeId || placeId === 'undefined' || placeId === 'null') {
      console.error('[ParkPage] Invalid place ID:', placeId);
      router.replace('/explore');
    }
  }, [placeId, router]);
  
  // ============================================
  // STATE
  // ============================================
  
  // UI Mode State Machine (simplified - use bottom sheet for trail selection)
  const [uiMode, setUIMode] = useState<ParkUIMode>('PARK_OVERVIEW');
  
  // Bottom Sheet State
  const [showTrailSheet, setShowTrailSheet] = useState(false);
  
  // Data State
  const [place, setPlace] = useState<any>(null);
  const [trails, setTrails] = useState<FrontendTrail[]>([]);
  const [trailsSource, setTrailsSource] = useState<string>('none');
  const [trailsMeta, setTrailsMeta] = useState<TrailsResponseMeta | undefined>(undefined);
  const [trailsLoading, setTrailsLoading] = useState(true);
  const [trailsError, setTrailsError] = useState<string | null>(null);
  const [weather, setWeather] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Selected Trail State
  const [selectedTrail, setSelectedTrail] = useState<FrontendTrail | null>(null);
  const [hoveredTrailId, setHoveredTrailId] = useState<string | null>(null);
  
  // Hike Start State
  const [startingHike, setStartingHike] = useState(false);
  const [hikeStartError, setHikeStartError] = useState<string | null>(null);
  
  // Offline PDF Map Pack State (per park)
  const [offlineMapStatus, setOfflineMapStatus] = useState<OfflineMapStatus>('not_downloaded');
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const [offlinePdfUnavailable, setOfflinePdfUnavailable] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // UI State
  const [expandedIntel, setExpandedIntel] = useState<string | null>(null);
  
  // Filter State
  const [filters, setFilters] = useState<TrailFilterState>({
    difficulty: [],
    distanceRange: [0, 50],
    elevationRange: [0, 5000],
    loopType: [],
    timeRange: [0, 8],
  });

  // ============================================
  // DATA LOADING
  // ============================================
  
  useEffect(() => {
    if (placeId && placeId !== 'undefined') {
      loadParkData();
    }
  }, [placeId, user]);

  const loadParkData = async () => {
    setLoadError(null);
    setLoading(true);
    setTrailsLoading(true);
    setTrailsError(null);
    
    try {
      console.log('[ParkPage] Loading park data for:', placeId);
      
      const placeResponse = await getPlace(placeId);
      console.log('[ParkPage] Place response:', placeResponse.data);
      setPlace(placeResponse.data);

      // Load trails
      try {
        const trailsResponse = await getPlaceTrails(placeId);
        const { trails: backendTrails, source, meta } = extractTrailsFromResponse(trailsResponse);
        const transformedTrails = transformTrails(backendTrails, placeResponse.data?.name, source);
        
        setTrails(transformedTrails);
        setTrailsSource(source);
        setTrailsMeta(meta);
      } catch (trailError: any) {
        console.error('[ParkPage] Failed to load trails:', trailError);
        setTrailsError(trailError.response?.data?.detail || trailError.message || 'Failed to load trails');
        setTrails([]);
      } finally {
        setTrailsLoading(false);
      }

      // Non-blocking loads
      getPlaceWeather(placeId).then((res) => setWeather(res.data)).catch(() => {});
      getPlaceAlerts(placeId).then((res) => setAlerts(res.data?.alerts || [])).catch(() => {});
      
      if (user) {
        checkFavorite(placeId).then((res) => setIsFavorite(res.data?.is_favorite || false)).catch(() => {});
      }
    } catch (error: any) {
      console.error('[ParkPage] Failed to load park data:', error);
      setLoadError(error.message || 'Failed to load park details');
    } finally {
      setLoading(false);
    }
  };

  // Disable PDF download if we previously learned there is no official PDF for this park
  useEffect(() => {
    try {
      const noPdf = localStorage.getItem(`offline_pdf_unavailable_${placeId}`) === 'true';
      if (noPdf) {
        setOfflineMapStatus('failed');
        setOfflinePdfUnavailable(true);
        setOfflineMessage(
          'Offline map not available for this park'
        );
      }
    } catch {
      // ignore
    }
  }, [placeId]);

  // ============================================
  // COMPUTED VALUES
  // ============================================
  
  const filteredTrails = trails.filter((trail) => {
    if (filters.difficulty.length > 0 && !filters.difficulty.includes(trail.difficulty?.toLowerCase())) {
      return false;
    }
    const distance = trail.distance || 0;
    if (distance < filters.distanceRange[0] || distance > filters.distanceRange[1]) return false;
    const elevation = trail.elevationGain || 0;
    if (elevation < filters.elevationRange[0] || elevation > filters.elevationRange[1]) return false;
    if (filters.loopType.length > 0) {
      const trailType = trail.loopType?.toLowerCase().replace(/\s+/g, '_');
      if (!trailType || !filters.loopType.includes(trailType)) return false;
    }
    return true;
  });

  // ============================================
  // TRAIL SELECTION HANDLERS (Bottom Sheet)
  // ============================================
  
  const handleTrailSelect = useCallback((trail: FrontendTrail) => {
    console.log('[ParkPage] Trail selected:', trail.name);
    setSelectedTrail(trail);
    setShowTrailSheet(true);
  }, []);

  const handleCloseTrailSheet = useCallback(() => {
    setShowTrailSheet(false);
    // Keep selectedTrail for map highlighting, clear after delay
    setTimeout(() => setSelectedTrail(null), 300);
    setHikeStartError(null);
  }, []);

  // ============================================
  // HIKE START HANDLER
  // ============================================
  
  const handleStartHike = async () => {
    if (!selectedTrail) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    setStartingHike(true);
    setHikeStartError(null);
    
    try {
      console.log('[ParkPage] Starting hike with trail:', selectedTrail.id, 'placeId:', placeId);

      // Capture coordinates explicitly at click-time (required for correct map initialization)
      const trailLat = selectedTrail.lat;
      const trailLng = selectedTrail.lng;
      if (typeof trailLat !== 'number' || typeof trailLng !== 'number') {
        setHikeStartError('Unable to load trail location. Please try again.');
        return;
      }
      
      const response = await createHike(selectedTrail.id, placeId);
      const hikeId = response.data?.hike?.id || response.data?.id || response.data?.hike_id;
      
      if (hikeId) {
        // Navigate to the new Hike Mode live page
        const qs = new URLSearchParams({
          trailId: selectedTrail.id,
          placeId,
          trailName: selectedTrail.name,
          lat: String(trailLat),
          lng: String(trailLng),
        });
        router.push(`/hikes/${hikeId}/live?${qs.toString()}`);
      } else {
        throw new Error('No hike ID in response');
      }
    } catch (error: any) {
      console.error('[ParkPage] Failed to start hike:', error);
      setHikeStartError(error.response?.data?.detail || error.message || 'Failed to start hike');
    } finally {
      setStartingHike(false);
    }
  };

  // ============================================
  // OFFLINE MAP HANDLER
  // ============================================

  const handleDownloadOfflineFromParkPage = async (source: 'park_page' | 'trail_modal' = 'park_page') => {
    if (!placeId) return;
    setOfflineMessage(null);

    try {
      setOfflineMapStatus('downloading');
      const result = await downloadOfflineMapPdf({
        placeId,
        parkName: place?.name,
        source,
      });

      if (result.ok) {
        setOfflineMapStatus('ready');
        setToastMessage('Downloaded offline map');
        setTimeout(() => setToastMessage(null), 2500);
        return;
      }

      // New backend contract: 200 JSON {available:false} maps to a user-friendly reason
      if (!result.ok && result.reason.toLowerCase().includes('offline map not available')) {
        setOfflineMapStatus('failed');
        setOfflineMessage('Offline map not available for this park');
        setOfflinePdfUnavailable(true);
        try {
          localStorage.setItem(`offline_pdf_unavailable_${placeId}`, 'true');
        } catch {}
        return;
      }

      setOfflineMapStatus('failed');
      setToastMessage(result.reason);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e: any) {
      setOfflineMapStatus('failed');
      setToastMessage(e?.message || 'Download failed');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleDownloadOfflineFromTrailModal = async () => {
    return handleDownloadOfflineFromParkPage('trail_modal');
  };

  // ============================================
  // OTHER HANDLERS
  // ============================================
  
  const handleFavoriteToggle = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      if (isFavorite) {
        await unfavoritePlace(placeId);
        setIsFavorite(false);
      } else {
        await favoritePlace(placeId);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('[ParkPage] Failed to toggle favorite:', error);
    }
  };

  // ============================================
  // LOADING / ERROR STATES
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading park details...</p>
        </div>
      </div>
    );
  }

  if (loadError || !place) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-center max-w-md px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{loadError || 'Park not found'}</h1>
          <p className="text-slate-600 mb-4">We couldn't load this park.</p>
          <button
            onClick={() => router.push('/explore')}
            className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium"
          >
            Return to explore
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: PARK OVERVIEW MODE (with Bottom Sheet)
  // ============================================
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Park Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">{place.name}</h1>
              <div className="flex items-center gap-3 text-slate-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {getLocationString(place)}
                </span>
                {place.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {place.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            
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
            {offlineMapStatus === 'ready' && (
              <div className="ml-auto">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Offline map downloaded
                </span>
              </div>
            )}
          </div>

          {/* Offline PDF download section */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleDownloadOfflineFromParkPage('park_page')}
              disabled={offlineMapStatus === 'downloading' || offlinePdfUnavailable}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#4F8A6B' }}
            >
              {offlineMapStatus === 'downloading' ? 'Downloading…' : '📥 Download Offline Map (PDF)'}
            </button>

            {offlineMessage ? (
              <div className="text-xs text-slate-600">{offlineMessage}</div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Park Intelligence */}
        <section className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {weather && (
              <button
                onClick={() => setExpandedIntel(expandedIntel === 'weather' ? null : 'weather')}
                className="bg-white rounded-xl p-4 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-slate-800">Weather</span>
                  </div>
                  {expandedIntel === 'weather' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                <p className="text-2xl font-bold text-slate-800">{weather.temperature}°F</p>
              </button>
            )}
            
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-slate-800">Best Season</span>
              </div>
              <p className="text-sm text-slate-700">Apr – Oct</p>
            </div>
            
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-slate-800">Permits</span>
              </div>
              <p className="text-xs text-slate-500">Check official site</p>
            </div>
            
            <button
              onClick={() => setExpandedIntel(expandedIntel === 'alerts' ? null : 'alerts')}
              className="bg-white rounded-xl p-4 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-slate-800">Alerts</span>
                </div>
              </div>
              <p className="text-sm text-slate-700">{alerts.length > 0 ? `${alerts.length} active` : 'None'}</p>
            </button>
          </div>
        </section>

        {/* Trails Section */}
        <section id="trails-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Trails</h2>
            {trailsSource === 'google_places_fallback' && (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                📍 Nearby trailheads
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Filters + Trail List */}
            <div className="lg:col-span-5 space-y-4">
              <TrailFilters filters={filters} onChange={setFilters} trailCount={filteredTrails.length} />

              <ErrorBoundary>
                <div className="space-y-3">
                  {trailsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                          <div className="flex items-start gap-3">
                            <div className="w-16 h-16 bg-slate-200 rounded-lg"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : trailsError ? (
                    <div className="bg-red-50 rounded-xl p-6 text-center border border-red-100">
                      <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-3" />
                      <h3 className="font-semibold text-red-800 mb-2">Failed to load trails</h3>
                      <button
                        onClick={loadParkData}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <RefreshCw className="w-4 h-4 inline mr-2" />
                        Retry
                      </button>
                    </div>
                  ) : filteredTrails.length > 0 ? (
                    filteredTrails.map((trail) => (
                      <div
                        key={trail.id}
                        onMouseEnter={() => setHoveredTrailId(trail.id)}
                        onMouseLeave={() => setHoveredTrailId(null)}
                      >
                        <TrailCard
                          trail={trail}
                          onClick={() => handleTrailSelect(trail)}
                          showTrailheadBadge={trail.isTrailhead}
                        />
                      </div>
                    ))
                  ) : trails.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center">
                      <Search className="w-8 h-8 text-slate-400 mx-auto mb-4" />
                      <h3 className="font-semibold text-slate-800 mb-2">No trails found</h3>
                      <button
                        onClick={loadParkData}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                      >
                        <RefreshCw className="w-4 h-4 inline mr-2" />
                        Retry
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl p-8 text-center">
                      <p className="text-slate-600">No trails match your filters</p>
                      <button
                        onClick={() => setFilters({
                          difficulty: [],
                          distanceRange: [0, 50],
                          elevationRange: [0, 5000],
                          loopType: [],
                          timeRange: [0, 8],
                        })}
                        className="mt-3 text-orange-600 hover:text-orange-700 font-medium text-sm"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </ErrorBoundary>
            </div>

            {/* Right: Map (SINGLE map, no duplicate cards) */}
            <div className="lg:col-span-7 hidden lg:block">
              <div className="sticky top-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <MapIcon className="w-5 h-5 text-orange-600" />
                      Trail Map
                    </h3>
                    <span className="text-xs text-slate-500">
                      Click a trail to view details
                    </span>
                  </div>
                  <ErrorBoundary>
                    <div className="h-[500px]">
                      <TrailMap
                        park={{
                          name: place?.name,
                          location: place?.location || { lat: 37.7749, lng: -122.4194 },
                        }}
                        trails={filteredTrails}
                        selectedTrail={null}
                        hoveredTrailId={hoveredTrailId}
                        onTrailSelect={handleTrailSelect}
                        onTrailDeselect={() => {}}
                        onStartHike={() => {}}
                        hidePreviewCard={true}
                      />
                    </div>
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Trail Selection Bottom Sheet */}
      <TrailSelectSheet
        isOpen={showTrailSheet}
        trail={selectedTrail}
        parkName={place?.name}
        weather={weather}
        onClose={handleCloseTrailSheet}
        onStartHike={handleStartHike}
        onDownloadOffline={handleDownloadOfflineFromTrailModal}
        loading={startingHike}
        offlineEnabled={!offlinePdfUnavailable}
        offlineDownloadLoading={offlineMapStatus === 'downloading'}
        offlineDisabledReason={offlinePdfUnavailable ? 'No official PDF available' : undefined}
      />

      {/* Hike Start Error Toast */}
      {hikeStartError && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800 flex-1">{hikeStartError}</p>
            <button
              onClick={() => setHikeStartError(null)}
              className="text-red-600 hover:text-red-800 p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Download toast */}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="bg-slate-900 text-white rounded-xl px-4 py-3 shadow-lg text-sm">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}

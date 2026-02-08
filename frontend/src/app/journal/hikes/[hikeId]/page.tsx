'use client';

/**
 * Hike Detail Page for Journal
 * Fetches real hike data from API, falls back to mock data for development
 */

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { mockHikes, mockDiscoveries } from '@/lib/journal/mockData';
import { generateHikeStory, organizePhotos, createTrailVideo, exportJournalEntry } from '@/lib/aiServices';
import type { Media as MediaItem } from '@/types';
import { MediaEnhancementJob } from '@/components/MediaEnhancementJob';
import { 
  ChevronLeft, MapPin, Calendar, Clock, TrendingUp, Mountain, 
  Route, Camera, FileText, Sparkles, Image as ImageIcon, Map,
  Leaf, PawPrint, Mountain as MountainIcon, BookOpen, Mic, Loader2
} from 'lucide-react';

interface HikeData {
  id: string;
  trailName: string;
  parkName: string;
  status: string;
  startTime: string;
  endTime?: string;
  stats: {
    distance: number;
    duration: number;
    elevationGain: number;
    elevationLoss?: number;
    maxAltitude?: number;
    avgPace?: number;
    movingTime?: number;
    calories?: number;
  };
  discoveries: any[];
  media: any[];
  reflection?: string;
  highlights?: string[];
  achievements?: string[];
}

interface DiscoveryData {
  id: string;
  category: string;
  name: string;
  scientificName?: string;
  description: string;
  confidence?: number;
  photo?: string;
  timestamp: string;
  aiInsights?: {
    habitat?: string;
    behavior?: string;
    funFacts?: string[];
  };
}

export default function HikeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const hikeId = params.hikeId as string;
  
  const [hike, setHike] = useState<HikeData | null>(null);
  const [hikeDiscoveries, setHikeDiscoveries] = useState<DiscoveryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reflection, setReflection] = useState('');
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'discoveries' | 'media' | 'reflection'>('overview');
  const [mediaJobs3d, setMediaJobs3d] = useState<Record<string, { status: string; jobId?: string; modelUrl?: string; error?: string }>>({});
  
  // AI Tools state
  const [generatingStory, setGeneratingStory] = useState(false);
  const [organizingPhotos, setOrganizingPhotos] = useState(false);
  const [creatingVideo, setCreatingVideo] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    loadHikeData();
  }, [hikeId]);

  const loadHikeData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to fetch from real API first
      const response = await api.get(`/api/v1/hikes/${hikeId}`);
      const hikeData = response.data;
      
      // Transform API response to our format
      const transformedHike: HikeData = {
        id: hikeData.id,
        trailName: hikeData.trail?.name || hikeData.meta_data?.trail_name || 'Unknown Trail',
        parkName: hikeData.place?.name || hikeData.meta_data?.park_name || 'Unknown Park',
        status: hikeData.status || 'completed',
        startTime: hikeData.start_time || hikeData.created_at,
        endTime: hikeData.end_time,
        stats: {
          distance: hikeData.meta_data?.distance_meters ? hikeData.meta_data.distance_meters / 1609.344 : 0,
          duration: hikeData.meta_data?.duration_seconds ? Math.round(hikeData.meta_data.duration_seconds / 60) : 0,
          elevationGain: hikeData.meta_data?.elevation_gain_meters ? Math.round(hikeData.meta_data.elevation_gain_meters * 3.28084) : 0,
          elevationLoss: 0,
          maxAltitude: 0,
          avgPace: 0,
        },
        discoveries: hikeData.meta_data?.discovery_captures || [],
        media: [],
        reflection: hikeData.meta_data?.reflection || '',
        highlights: hikeData.meta_data?.highlights || [],
        achievements: hikeData.meta_data?.earned_badges?.map((b: any) => b.type) || [],
      };

      // Load media for this hike
      try {
        const mediaRes = await api.get(`/api/v1/hikes/${hikeId}/media`);
        transformedHike.media = mediaRes.data?.media || [];
      } catch (e) {
        console.warn('[HikeDetail] Failed to load hike media:', e);
      }
      
      setHike(transformedHike);
      setReflection(transformedHike.reflection || '');
      
      // Transform discoveries
      const discoveryCaptures = hikeData.meta_data?.discovery_captures || [];
      const discoveryNodes = hikeData.meta_data?.discovery_nodes || [];
      
      const transformedDiscoveries: DiscoveryData[] = discoveryCaptures.map((capture: any) => {
        const node = discoveryNodes.find((n: any) => n.id === capture.nodeId);
        return {
          id: capture.id,
          category: node?.category || 'other',
          name: node?.title || 'Unknown Discovery',
          description: node?.shortFact || capture.note || '',
          confidence: capture.confidence,
          photo: capture.photoUrl,
          timestamp: capture.capturedAt,
          aiInsights: node?.aiInsights,
        };
      });
      
      setHikeDiscoveries(transformedDiscoveries);
      
    } catch (err: any) {
      console.warn('[HikeDetail] API fetch failed, checking mock data:', err.message);
      
      // Fallback to mock data
      const mockHike = mockHikes.find(h => h.id === hikeId);
      if (mockHike) {
        setHike({
          id: mockHike.id,
          trailName: mockHike.trailName,
          parkName: mockHike.parkName,
          status: mockHike.status,
          startTime: mockHike.startTime,
          endTime: mockHike.endTime,
          stats: mockHike.stats,
          discoveries: mockHike.discoveries as any,
          media: mockHike.media || [],
          reflection: mockHike.reflection,
          highlights: mockHike.highlights,
          achievements: mockHike.achievements,
        });
        setReflection(mockHike.reflection || '');
        
        const mockDiscs = mockDiscoveries.filter(d => d.hikeId === hikeId);
        setHikeDiscoveries(mockDiscs.map(d => ({
          id: d.id,
          category: d.category,
          name: d.name,
          scientificName: d.scientificName,
          description: d.description,
          confidence: d.confidence,
          photo: d.photo,
          timestamp: d.timestamp,
          aiInsights: d.aiInsights,
        })));
      } else {
        setError('Hike not found');
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadMorePhotos = async (files: FileList | null) => {
    if (!files || !files.length) return;
    if (!hike) return;

    try {
      const uploads = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (uploads.length === 0) return;

      for (const file of uploads) {
        const form = new FormData();
        form.append('file', file);
        form.append('type', 'photo');
        // optional: form.append('category', 'journal');

        const res = await api.post(`/api/v1/hikes/${hikeId}/media`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const created = res.data;
        setHike((prev) => {
          if (!prev) return prev;
          return { ...prev, media: [...(prev.media || []), created] };
        });
      }
    } catch (e) {
      console.error('[HikeDetail] Upload failed:', e);
      alert('Failed to upload photo(s). Please try again.');
    }
  };

  const start3dForMedia = async (media: MediaItem) => {
    try {
      setMediaJobs3d((prev) => ({ ...prev, [media.id]: { status: 'starting' } }));
      const res = await api.post(`/api/v1/media/${media.id}/3d`);
      const jobId = res.data?.job_id;
      const modelUrl = res.data?.model_url;
      if (!jobId) throw new Error('No job_id returned');

      setMediaJobs3d((prev) => ({ ...prev, [media.id]: { status: 'queued', jobId, modelUrl } }));

      const poll = setInterval(async () => {
        try {
          const statusRes = await api.get(`/api/v1/3d-jobs/${jobId}`);
          const status = statusRes.data?.status || 'unknown';
          const model = statusRes.data?.model_url || modelUrl;
          if (status === 'completed') {
            clearInterval(poll);
            setMediaJobs3d((prev) => ({ ...prev, [media.id]: { status, jobId, modelUrl: model } }));
            // Update local media metadata so UI can show the download link
            setHike((prev) => {
              if (!prev) return prev;
              const nextMedia = (prev.media || []).map((m: any) => {
                if (m.id !== media.id) return m;
                return {
                  ...m,
                  meta_data: {
                    ...(m.meta_data || {}),
                    model_3d_url: model,
                    model_3d_job_id: jobId,
                  },
                };
              });
              return { ...prev, media: nextMedia };
            });
          } else if (status === 'failed') {
            clearInterval(poll);
            setMediaJobs3d((prev) => ({ ...prev, [media.id]: { status, jobId, modelUrl: model, error: statusRes.data?.error } }));
          } else {
            setMediaJobs3d((prev) => ({ ...prev, [media.id]: { status, jobId, modelUrl: model } }));
          }
        } catch (e) {
          // ignore transient polling errors
        }
      }, 2000);
    } catch (e: any) {
      console.error('[HikeDetail] Failed to start 3D job:', e);
      setMediaJobs3d((prev) => ({ ...prev, [media.id]: { status: 'failed', error: e?.response?.data?.detail || e?.message } }));
      alert('Failed to start 3D generation.');
    }
  };

  const handleSaveReflection = async () => {
    if (!hike) return;
    
    try {
      await api.patch(`/api/v1/hikes/${hikeId}`, {
        meta_data: { reflection }
      });
      alert('Reflection saved!');
    } catch (err) {
      console.warn('Failed to save reflection:', err);
      // Still update local state
      setHike({ ...hike, reflection });
    }
  };

  // AI Tools Handlers
  const handleGenerateStory = async () => {
    if (generatingStory) return;
    
    setGeneratingStory(true);
    try {
      const story = await generateHikeStory(hikeId, 'narrative');
      setAiResult({ type: 'story', data: story });
      setShowAiModal(true);
    } catch (error) {
      console.error('Failed to generate story:', error);
      alert('Failed to generate story. Please try again.');
    } finally {
      setGeneratingStory(false);
    }
  };

  const handleOrganizePhotos = async () => {
    if (organizingPhotos) return;
    
    setOrganizingPhotos(true);
    try {
      const result = await organizePhotos(hikeId);
      setAiResult({ type: 'photos', data: result });
      setShowAiModal(true);
    } catch (error) {
      console.error('Failed to organize photos:', error);
      alert('Failed to organize photos. Please try again.');
    } finally {
      setOrganizingPhotos(false);
    }
  };

  const handleCreateVideo = async () => {
    if (creatingVideo) return;
    
    setCreatingVideo(true);
    try {
      const result = await createTrailVideo(hikeId);
      setAiResult({ type: 'video', data: result });
      setShowAiModal(true);
    } catch (error) {
      console.error('Failed to create video:', error);
      alert('Failed to create video. Please try again.');
    } finally {
      setCreatingVideo(false);
    }
  };

  const handleExportJournal = async () => {
    if (exporting) return;
    
    setExporting(true);
    try {
      const blob = await exportJournalEntry(hikeId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hike-${hikeId}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
      alert('Failed to export journal entry. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading hike details...</p>
        </div>
      </div>
    );
  }

  if (error || !hike) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🥾</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Hike not found</h1>
          <p className="text-slate-600 mb-4">{error || 'Could not load hike details'}</p>
          <button 
            onClick={() => router.push('/journal')}
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            Return to journal
          </button>
        </div>
      </div>
    );
  }

  const categoryIcons: Record<string, any> = {
    wildlife: PawPrint,
    vegetation: Leaf,
    geology: MountainIcon,
    history: BookOpen,
    plant: Leaf,
    viewpoint: Mountain,
    water: Leaf,
  };

  const categoryColors: Record<string, string> = {
    wildlife: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    vegetation: 'bg-green-100 text-green-700 border-green-200',
    geology: 'bg-slate-100 text-slate-700 border-slate-200',
    history: 'bg-amber-100 text-amber-700 border-amber-200',
    plant: 'bg-green-100 text-green-700 border-green-200',
    viewpoint: 'bg-blue-100 text-blue-700 border-blue-200',
    water: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    other: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const durationMinutes = hike.stats.duration || 0;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => router.push('/journal')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Back to journal"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">{hike.trailName}</h1>
              <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {hike.parkName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(hike.startTime).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-600 mb-1">Distance</p>
              <p className="text-lg font-bold text-slate-800">{hike.stats.distance.toFixed(1)} mi</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-600 mb-1">Duration</p>
              <p className="text-lg font-bold text-slate-800">{hours}h {minutes}m</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-600 mb-1">Elevation</p>
              <p className="text-lg font-bold text-slate-800">{hike.stats.elevationGain.toLocaleString()} ft</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-600 mb-1">Discoveries</p>
              <p className="text-lg font-bold text-slate-800">{hikeDiscoveries.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Section Navigation */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200 sticky top-[140px] z-20">
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {[
              { key: 'overview', label: 'Overview', icon: Mountain },
              { key: 'discoveries', label: `Discoveries (${hikeDiscoveries.length})`, icon: Camera },
              { key: 'media', label: 'Media', icon: ImageIcon },
              { key: 'reflection', label: 'Reflection', icon: FileText },
            ].map(section => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key as any)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeSection === section.key
                    ? 'text-orange-600 border-orange-600'
                    : 'text-slate-600 border-transparent hover:text-slate-800'
                }`}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main Panel */}
          <div className="flex-1 space-y-4">
            
            {/* Overview Section */}
            {activeSection === 'overview' && (
              <>
                {/* Route Section */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Map className="w-5 h-5 text-orange-600" />
                    Route
                  </h2>
                  <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-slate-500">
                      <Map className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <p>Map visualization placeholder</p>
                      <p className="text-sm mt-1">Route polyline and waypoints</p>
                    </div>
                  </div>
                </div>

                {/* Elevation Profile */}
                {hike.stats.maxAltitude && hike.stats.maxAltitude > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                      Elevation Profile
                    </h2>
                    <div className="aspect-[3/1] bg-slate-100 rounded-lg flex items-center justify-center">
                      <div className="text-center text-slate-500">
                        <TrendingUp className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        <p>Elevation chart placeholder</p>
                        <p className="text-sm mt-1">
                          Max: {hike.stats.maxAltitude?.toLocaleString()} ft • 
                          Gain: {hike.stats.elevationGain.toLocaleString()} ft
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Highlights */}
                {hike.highlights && hike.highlights.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Mountain className="w-5 h-5 text-orange-600" />
                      Highlights
                    </h2>
                    <ul className="space-y-2">
                      {hike.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-slate-700">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Achievements/Badges */}
                {hike.achievements && hike.achievements.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200 rounded-2xl p-6">
                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      🏆 Achievements Earned
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {hike.achievements.map((ach, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-white rounded-full text-sm font-medium text-amber-700 border border-amber-200">
                          {ach.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Discoveries Section */}
            {activeSection === 'discoveries' && (
              <div className="space-y-4">
                {hikeDiscoveries.length > 0 ? (
                  hikeDiscoveries.map((discovery) => {
                    const CategoryIcon = categoryIcons[discovery.category] || Camera;
                    const colorClass = categoryColors[discovery.category] || categoryColors.other;
                    return (
                      <div key={discovery.id} className="bg-white rounded-2xl p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                          {discovery.photo && (
                            <div className="w-24 h-24 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden">
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Camera className="w-8 h-8" />
                              </div>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
                                    <CategoryIcon className="w-3 h-3 inline mr-1" />
                                    {discovery.category}
                                  </span>
                                  {discovery.confidence && (
                                    <span className="text-xs text-slate-500">
                                      {Math.round(discovery.confidence * 100)}% confident
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">{discovery.name}</h3>
                                {discovery.scientificName && (
                                  <p className="text-sm italic text-slate-600">{discovery.scientificName}</p>
                                )}
                              </div>
                            </div>
                            <p className="text-slate-700 mb-3">{discovery.description}</p>
                            {discovery.aiInsights && (
                              <div className="space-y-2">
                                {discovery.aiInsights.habitat && (
                                  <p className="text-sm text-slate-600">
                                    <span className="font-medium">Habitat:</span> {discovery.aiInsights.habitat}
                                  </p>
                                )}
                                {discovery.aiInsights.funFacts && discovery.aiInsights.funFacts.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium text-slate-700 mb-1">Fun Facts:</p>
                                    <ul className="text-sm text-slate-600 space-y-1">
                                      {discovery.aiInsights.funFacts.map((fact, idx) => (
                                        <li key={idx}>• {fact}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-slate-500 mt-3">
                              {new Date(discovery.timestamp).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                    <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No discoveries logged for this hike</p>
                    <p className="text-sm text-slate-500 mt-2">
                      Use the camera during your next hike to identify and log discoveries!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Media Section */}
            {activeSection === 'media' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">Media</h2>
                      <p className="text-sm text-slate-600">Upload more photos, enhance with AI, or generate a 3D model.</p>
                    </div>
                    <label className="px-4 py-2 rounded-xl text-sm font-medium text-white cursor-pointer" style={{ backgroundColor: '#4F8A6B' }}>
                      Upload photos
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => uploadMorePhotos(e.target.files)}
                      />
                    </label>
                  </div>

                  {hike.media && hike.media.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {hike.media
                        .filter((m: any) => m.type === 'photo')
                        .map((item: MediaItem, idx: number) => {
                          const enhancedUrl = (item.meta_data as any)?.enhanced_url;
                          const model3dUrl = (item.meta_data as any)?.model_3d_url;
                          const displayUrl = enhancedUrl || item.url;
                          const absoluteUrl =
                            displayUrl?.startsWith('http')
                              ? displayUrl
                              : `${process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${displayUrl}`;

                          const job3d = mediaJobs3d[item.id];

                          return (
                            <div key={item.id || idx} className="space-y-3">
                              <div
                                className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
                                style={{ backgroundColor: '#E8E8E3' }}
                                onClick={() => {
                                  if (absoluteUrl) window.open(absoluteUrl, '_blank');
                                }}
                              >
                                {absoluteUrl ? (
                                  <img
                                    src={absoluteUrl}
                                    alt={`Photo ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-4xl">📸</div>
                                )}
                                {enhancedUrl && (
                                  <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: '#4C7EF3' }}>
                                    ✨ Enhanced
                                  </div>
                                )}
                              </div>

                              {/* AI Enhance */}
                              <MediaEnhancementJob
                                media={item}
                                onEnhanced={(url) => {
                                  // reflect enhanced url in UI
                                  setHike((prev) => {
                                    if (!prev) return prev;
                                    const nextMedia = (prev.media || []).map((m: any) =>
                                      m.id === item.id
                                        ? { ...m, meta_data: { ...(m.meta_data || {}), enhanced_url: url } }
                                        : m
                                    );
                                    return { ...prev, media: nextMedia };
                                  });
                                }}
                              />

                              {/* 3D */}
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  onClick={() => start3dForMedia(item)}
                                  disabled={job3d?.status === 'starting' || job3d?.status === 'queued' || job3d?.status === 'processing'}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                                  style={{ backgroundColor: '#8B6F47' }}
                                >
                                  {job3d?.status === 'processing' ? 'Creating 3D…' : '🧊 Create 3D model'}
                                </button>
                                {(model3dUrl || job3d?.modelUrl) && (
                                  <a
                                    href={(model3dUrl || job3d?.modelUrl) as string}
                                    target="_blank"
                                    className="text-xs underline"
                                    style={{ color: '#5F6F6A' }}
                                  >
                                    Download OBJ
                                  </a>
                                )}
                              </div>

                              {job3d?.error && (
                                <div className="text-xs" style={{ color: '#B45309' }}>
                                  3D error: {job3d.error}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-slate-600">
                      <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      No photos yet. Upload some to enhance or generate a 3D model.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reflection Section */}
            {activeSection === 'reflection' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-600" />
                    Your Reflection
                  </h2>
                  <textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Share your thoughts about this hike..."
                    className="w-full min-h-[200px] p-4 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <button className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
                      <Mic className="w-4 h-4" />
                      Add voice note
                    </button>
                    <button 
                      onClick={handleSaveReflection}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                    >
                      Save reflection
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tools Drawer - Desktop */}
          <aside className="w-72 flex-shrink-0 hidden lg:block">
            <div className="sticky top-[220px]">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-slate-800">AI Tools</h3>
                </div>
                <div className="space-y-2">
                  <button 
                    onClick={handleGenerateStory}
                    disabled={generatingStory}
                    className="w-full px-4 py-2.5 bg-white hover:bg-purple-50 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{generatingStory ? 'Generating...' : 'Generate AI story'}</span>
                    {generatingStory ? <Loader2 className="w-4 h-4 text-purple-600 animate-spin" /> : <Sparkles className="w-4 h-4 text-purple-600" />}
                  </button>
                  <button 
                    onClick={handleOrganizePhotos}
                    disabled={organizingPhotos}
                    className="w-full px-4 py-2.5 bg-white hover:bg-purple-50 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{organizingPhotos ? 'Organizing...' : 'Organize photos'}</span>
                    {organizingPhotos ? <Loader2 className="w-4 h-4 text-purple-600 animate-spin" /> : <Sparkles className="w-4 h-4 text-purple-600" />}
                  </button>
                  <button 
                    onClick={handleCreateVideo}
                    disabled={creatingVideo}
                    className="w-full px-4 py-2.5 bg-white hover:bg-purple-50 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{creatingVideo ? 'Creating...' : 'Create trail video'}</span>
                    {creatingVideo ? <Loader2 className="w-4 h-4 text-purple-600 animate-spin" /> : <Sparkles className="w-4 h-4 text-purple-600" />}
                  </button>
                  <button 
                    onClick={handleExportJournal}
                    disabled={exporting}
                    className="w-full px-4 py-2.5 bg-white hover:bg-purple-50 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{exporting ? 'Exporting...' : 'Export journal entry'}</span>
                    {exporting ? <Loader2 className="w-4 h-4 text-purple-600 animate-spin" /> : <Route className="w-4 h-4 text-purple-600" />}
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                  Use AI to enhance your hike memories and create shareable content.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile Tools FAB */}
      <button
        onClick={() => setShowToolsDrawer(!showToolsDrawer)}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:scale-105 transition-transform"
        aria-label="AI Tools"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Mobile Tools Bottom Sheet */}
      {showToolsDrawer && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowToolsDrawer(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-slate-800">AI Tools</h3>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => { handleGenerateStory(); setShowToolsDrawer(false); }}
                disabled={generatingStory}
                className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingStory ? 'Generating...' : 'Generate AI story'}
              </button>
              <button 
                onClick={() => { handleOrganizePhotos(); setShowToolsDrawer(false); }}
                disabled={organizingPhotos}
                className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {organizingPhotos ? 'Organizing...' : 'Organize photos'}
              </button>
              <button 
                onClick={() => { handleCreateVideo(); setShowToolsDrawer(false); }}
                disabled={creatingVideo}
                className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingVideo ? 'Creating...' : 'Create trail video'}
              </button>
              <button 
                onClick={() => { handleExportJournal(); setShowToolsDrawer(false); }}
                disabled={exporting}
                className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? 'Exporting...' : 'Export journal entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Result Modal */}
      {showAiModal && aiResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAiModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                AI Result
              </h2>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">
                ×
              </button>
            </div>
            
            {aiResult.type === 'story' && (
              <div className="prose prose-slate max-w-none">
                <p className="whitespace-pre-wrap">{aiResult.data.story}</p>
                {aiResult.data.highlights && aiResult.data.highlights.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Highlights:</h3>
                    <ul className="list-disc pl-5">
                      {aiResult.data.highlights.map((h: string, i: number) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {aiResult.type === 'photos' && (
              <div>
                {aiResult.data.message ? (
                  <p className="whitespace-pre-wrap text-slate-700">{aiResult.data.message}</p>
                ) : (
                  <div>
                    <p className="text-slate-700 mb-4">Your photos have been organized!</p>
                    {aiResult.data.albums && aiResult.data.albums.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-2">Albums created:</h3>
                        <ul className="list-disc pl-5">
                          {aiResult.data.albums.map((album: any, i: number) => (
                            <li key={i}>{album.name} ({album.photos.length} photos)</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {aiResult.type === 'video' && (
              <div>
                {aiResult.data.message ? (
                  <p className="whitespace-pre-wrap text-slate-700">{aiResult.data.message}</p>
                ) : aiResult.data.video_url ? (
                  <div>
                    <p className="text-slate-700 mb-4">Your trail video is ready!</p>
                    <video controls className="w-full rounded-lg">
                      <source src={aiResult.data.video_url} type="video/mp4" />
                    </video>
                  </div>
                ) : (
                  <p className="text-slate-700">Video creation in progress...</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

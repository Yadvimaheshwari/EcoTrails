'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { getHike, getUserAchievements, getJournalEntries } from '@/lib/api';
import { BackgroundSystem } from '@/components/BackgroundSystem';
import { EmptyState } from '@/components/ui/EmptyState';
import { MapViewer } from '@/components/MapViewer';
import { AINarrativeGenerator } from '@/components/AINarrativeGenerator';
import { MediaEnhancementJob } from '@/components/MediaEnhancementJob';
import { validateResponse, HikeResponseSchema } from '@/lib/validation';
import type { Hike, JournalEntry, Media, Discovery } from '@/types';

type TabType = 'overview' | 'media' | 'discoveries' | 'notes' | 'map';

export default function JournalDetailV2Page() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [hike, setHike] = useState<Hike | null>(null);
  const [journalEntry, setJournalEntry] = useState<JournalEntry | null>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user || !params.id) return;

    try {
      setLoading(true);
      setError(null);

      const hikeId = params.id as string;
      const [hikeRes, achievementsRes, journalRes] = await Promise.all([
        getHike(hikeId),
        getUserAchievements(),
        getJournalEntries(hikeId),
      ]);

      // Validate hike response
      const hikeValidation = validateResponse(
        HikeResponseSchema,
        hikeRes.data,
        'Hike details response'
      );

      if (!hikeValidation.success) {
        console.error('Validation failed for hike:', hikeValidation.error);
        setError('Failed to load hike data. Please try again.');
        return;
      }

      setHike(hikeValidation.data.data);
      setAchievements(achievementsRes.data?.achievements || []);

      // Find journal entry for this hike
      const entries = journalRes.data?.entries || [];
      const entry = entries.find((e: JournalEntry) => 
        e.hike_id === hikeId && e.entry_type === 'hike_summary'
      ) || entries.find((e: JournalEntry) => e.hike_id === hikeId);
      setJournalEntry(entry || null);
    } catch (err) {
      console.error('Failed to load journal detail:', err);
      setError('Failed to load hike details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, params.id]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadData();
    }
  }, [isLoading, user, router, loadData]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F6F8F7' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#0F3D2E' }}></div>
          <p className="text-textSecondary">Loading hike details...</p>
        </div>
      </div>
    );
  }

  if (error || !hike) {
    return (
      <BackgroundSystem context="journal" userPhotos={[]}>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center py-16">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-2xl font-medium text-text mb-2">
              {error || 'Hike not found'}
            </h2>
            <p className="text-textSecondary mb-6">
              {error || 'The hike you\'re looking for doesn\'t exist or has been removed.'}
            </p>
            <Link
              href="/journal"
              className="inline-block px-6 py-3 rounded-xl font-medium text-white transition-colors"
              style={{ backgroundColor: '#4F8A6B' }}
            >
              Back to Journal
            </Link>
          </div>
        </div>
      </BackgroundSystem>
    );
  }

  const hikeAchievements = achievements.filter(a => a.hike_id === hike.id);
  const media = hike.media || [];
  const discoveries = hike.discoveries || (journalEntry?.meta_data as any)?.discoveries || [];
  const userPhotos = media
    .filter((m: Media) => m.type === 'photo' && m.url)
    .map((m: Media) => m.url)
    .slice(0, 8);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'media', label: 'Media', icon: '📸' },
    { id: 'discoveries', label: 'Discoveries', icon: '🦌' },
    { id: 'notes', label: 'Notes', icon: '📝' },
    { id: 'map', label: 'Map', icon: '🗺️' },
  ];

  return (
    <BackgroundSystem context="journal" userPhotos={userPhotos}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/journal"
            className="inline-flex items-center gap-2 text-textSecondary hover:text-text transition-colors mb-4"
          >
            ← Back to Journal
          </Link>
          <h1 className="text-5xl font-light mb-2 text-text">
            {hike.trail?.name || 'Completed Hike'}
          </h1>
          {hike.trail?.place?.name && (
            <p className="text-textSecondary">{hike.trail.place.name}</p>
          )}
          {hike.start_time && (
            <p className="text-sm text-textSecondary mt-2">
              {format(parseISO(hike.start_time), 'MMMM d, yyyy')}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
              style={{
                backgroundColor: activeTab === tab.id ? '#0F3D2E' : '#FAFAF8',
                color: activeTab === tab.id ? 'white' : '#5F6F6A',
                border: '1px solid #E8E8E3',
              }}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && <OverviewTab hike={hike} journalEntry={journalEntry} achievements={hikeAchievements} />}
          {activeTab === 'media' && <MediaTab media={media} />}
          {activeTab === 'discoveries' && <DiscoveriesTab discoveries={discoveries} />}
          {activeTab === 'notes' && <NotesTab journalEntry={journalEntry} hike={hike} />}
          {activeTab === 'map' && <MapTab hike={hike} />}
        </div>
      </div>
    </BackgroundSystem>
  );
}

// Overview Tab
function OverviewTab({ hike, journalEntry, achievements }: { hike: Hike; journalEntry: JournalEntry | null; achievements: any[] }) {
  const metadata = journalEntry?.meta_data as any;
  const aiSummary = metadata?.ai_summary || hike.meta_data?.ai_summary;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {hike.distance_miles && (
          <div className="p-4 rounded-2xl text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}>
            <div className="text-2xl mb-2">📏</div>
            <div className="text-2xl font-light text-text mb-1">{hike.distance_miles.toFixed(1)}</div>
            <div className="text-xs text-textSecondary">miles</div>
          </div>
        )}
        {hike.elevation_gain_feet && (
          <div className="p-4 rounded-2xl text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}>
            <div className="text-2xl mb-2">⛰</div>
            <div className="text-2xl font-light text-text mb-1">+{Math.round(hike.elevation_gain_feet)}</div>
            <div className="text-xs text-textSecondary">ft elevation</div>
          </div>
        )}
        {hike.duration_minutes && (
          <div className="p-4 rounded-2xl text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}>
            <div className="text-2xl mb-2">⏱</div>
            <div className="text-2xl font-light text-text mb-1">
              {Math.floor(hike.duration_minutes / 60)}h {hike.duration_minutes % 60}m
            </div>
            <div className="text-xs text-textSecondary">duration</div>
          </div>
        )}
        {hike.max_altitude_feet && (
          <div className="p-4 rounded-2xl text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}>
            <div className="text-2xl mb-2">🏔</div>
            <div className="text-2xl font-light text-text mb-1">{Math.round(hike.max_altitude_feet)}</div>
            <div className="text-xs text-textSecondary">ft max altitude</div>
          </div>
        )}
      </div>

      {/* Achievements */}
      {achievements.length > 0 ? (
        <div>
          <h3 className="text-xl font-light text-text mb-4">Achievements</h3>
          <div className="flex flex-wrap gap-2">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="px-4 py-2 rounded-xl"
                style={{ backgroundColor: '#FFF8F0', border: '1px solid #F4A34040' }}
              >
                <span className="text-sm text-text">
                  🏆 {achievement.achievement?.name || achievement.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* AI Narrative Generator (async, non-blocking) */}
      <AINarrativeGenerator
        hike={hike}
        journalEntry={journalEntry}
        onNarrativeGenerated={(narrative) => {
          // Update local state if needed
          console.log('Narrative generated:', narrative);
        }}
      />

      {/* AI Summary */}
      {aiSummary ? (
        <div>
          <h3 className="text-xl font-light text-text mb-4">AI Summary</h3>
          {aiSummary.hike_narrative && (
            <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: '#E8F4F8', border: '1px solid #4C7EF340' }}>
              <div className="text-sm font-medium text-text mb-2">Hike Narrative</div>
              <div className="text-sm text-textSecondary whitespace-pre-wrap">{aiSummary.hike_narrative}</div>
            </div>
          )}
          {aiSummary.learning_highlights && Array.isArray(aiSummary.learning_highlights) && aiSummary.learning_highlights.length > 0 && (
            <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3' }}>
              <div className="text-sm font-medium text-text mb-2">Learning Highlights</div>
              <ul className="space-y-1">
                {aiSummary.learning_highlights.map((highlight: string, idx: number) => (
                  <li key={idx} className="text-sm text-textSecondary flex items-start gap-2">
                    <span>•</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {aiSummary.memorable_moments && Array.isArray(aiSummary.memorable_moments) && aiSummary.memorable_moments.length > 0 && (
            <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: '#FFF8F0', border: '1px solid #F4A34040' }}>
              <div className="text-sm font-medium text-text mb-2">Memorable Moments</div>
              <ul className="space-y-1">
                {aiSummary.memorable_moments.map((moment: string, idx: number) => (
                  <li key={idx} className="text-sm text-textSecondary flex items-start gap-2">
                    <span>⭐</span>
                    <span>{moment}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}

      {/* Weather */}
      {hike.weather ? (
        <div>
          <h3 className="text-xl font-light text-text mb-4">Weather</h3>
          <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3' }}>
            <div className="text-sm text-textSecondary">
              {JSON.stringify(hike.weather, null, 2)}
            </div>
          </div>
        </div>
      ) : null}

      {/* Empty State */}
      {!hike.distance_miles && !hike.elevation_gain_feet && !hike.duration_minutes && achievements.length === 0 && !aiSummary && !hike.weather && (
        <EmptyState
          icon="📊"
          title="No overview data"
          message="This hike doesn't have any overview information yet"
        />
      )}
    </div>
  );
}

// Media Tab
function MediaTab({ media }: { media: Media[] }) {
  if (media.length === 0) {
    return (
      <EmptyState
        icon="📸"
        title="No media"
        message="No photos, videos, or audio recordings for this hike"
      />
    );
  }

  const photos = media.filter(m => m.type === 'photo');
  const videos = media.filter(m => m.type === 'video');
  const audio = media.filter(m => m.type === 'audio');

  return (
    <div className="space-y-6">
      {/* Photos */}
      {photos.length > 0 && (
        <div>
          <h3 className="text-xl font-light text-text mb-4">Photos ({photos.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((item, idx) => {
              const enhancedUrl = (item.meta_data as any)?.enhanced_url;
              const displayUrl = enhancedUrl || item.url;
              
              return (
                <div
                  key={item.id || idx}
                  className="space-y-3"
                >
                  <div
                    className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
                    style={{ backgroundColor: '#E8E8E3' }}
                    onClick={() => {
                      if (displayUrl) {
                        const url = displayUrl.startsWith('http') ? displayUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${displayUrl}`;
                        window.open(url, '_blank');
                      }
                    }}
                  >
                    {displayUrl ? (
                      <img
                        src={displayUrl.startsWith('http') ? displayUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${displayUrl}`}
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
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to view full size
                    </div>
                  </div>
                  {/* Enhancement Job Component */}
                  <MediaEnhancementJob
                    media={item}
                    onEnhanced={(url) => {
                      // Reload data to show enhanced version
                      console.log('Enhanced version available:', url);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div>
          <h3 className="text-xl font-light text-text mb-4">Videos ({videos.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((item, idx) => (
              <div
                key={item.id || idx}
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: '#E8E8E3' }}
              >
                {item.url ? (
                  <video
                    src={item.url.startsWith('http') ? item.url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${item.url}`}
                    controls
                    className="w-full"
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center text-4xl">🎥</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audio */}
      {audio.length > 0 && (
        <div>
          <h3 className="text-xl font-light text-text mb-4">Audio Recordings ({audio.length})</h3>
          <div className="space-y-3">
            {audio.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 rounded-2xl"
                style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3' }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🎙</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text">Recording {idx + 1}</div>
                    {item.created_at && (
                      <div className="text-xs text-textSecondary">
                        {format(parseISO(item.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    )}
                  </div>
                  {item.url && (
                    <audio
                      src={item.url.startsWith('http') ? item.url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${item.url}`}
                      controls
                      className="flex-1"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Discoveries Tab
function DiscoveriesTab({ discoveries }: { discoveries: Discovery[] }) {
  if (!discoveries || discoveries.length === 0) {
    return (
      <EmptyState
        icon="🦌"
        title="No discoveries"
        message="No wildlife, plants, geology, or cultural discoveries recorded for this hike"
      />
    );
  }

  const grouped = discoveries.reduce((acc, discovery) => {
    const type = discovery.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(discovery);
    return acc;
  }, {} as Record<string, Discovery[]>);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          <h3 className="text-xl font-light text-text mb-4 capitalize">
            {type === 'wildlife' ? '🦌 Wildlife' :
             type === 'plant' ? '🌿 Plants' :
             type === 'geology' ? '🪨 Geology' :
             type === 'cultural' ? '🏛 Cultural' : '📍 Other'}
            {' '}({items.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((discovery, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}
              >
                <div className="text-2xl mb-2">
                  {discovery.type === 'wildlife' ? '🦌' :
                   discovery.type === 'plant' ? '🌿' :
                   discovery.type === 'geology' ? '🪨' :
                   discovery.type === 'cultural' ? '🏛' : '📍'}
                </div>
                <div className="text-sm font-medium text-text capitalize mb-1">
                  {discovery.type || 'Discovery'}
                </div>
                {discovery.description && (
                  <div className="text-xs text-textSecondary mb-2">{discovery.description}</div>
                )}
                {discovery.location?.elevation && (
                  <div className="text-xs text-textSecondary">
                    Elevation: {discovery.location.elevation} ft
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Notes Tab
function NotesTab({ journalEntry, hike }: { journalEntry: JournalEntry | null; hike: Hike }) {
  const content = journalEntry?.content;
  const metadata = journalEntry?.meta_data as any;
  const prepNotes = metadata?.prep_notes;
  const reflection = metadata?.reflection;

  if (!content && !prepNotes && !reflection) {
    return (
      <EmptyState
        icon="📝"
        title="No notes"
        message="No journal entries, reflections, or prep notes for this hike"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Journal Entry */}
      {content && (
        <div>
          <h3 className="text-xl font-light text-text mb-4">Journal Entry</h3>
          <div className="p-6 rounded-2xl whitespace-pre-wrap text-sm text-textSecondary" style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3' }}>
            {content}
          </div>
          {journalEntry?.created_at && (
            <p className="text-xs text-textSecondary mt-2">
              {format(parseISO(journalEntry.created_at), 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </div>
      )}

      {/* Reflection */}
      {reflection && (
        <div>
          <h3 className="text-xl font-light text-text mb-4">Reflection</h3>
          <div className="p-6 rounded-2xl whitespace-pre-wrap text-sm text-textSecondary" style={{ backgroundColor: '#FFF8F0', border: '1px solid #F4A34040' }}>
            {reflection}
          </div>
        </div>
      )}

      {/* Prep Notes */}
      {prepNotes && (
        <div>
          <h3 className="text-xl font-light text-text mb-4">Prep Notes</h3>
          <div className="p-6 rounded-2xl whitespace-pre-wrap text-sm text-textSecondary" style={{ backgroundColor: '#E8F4F8', border: '1px solid #4C7EF340' }}>
            {prepNotes}
          </div>
        </div>
      )}
    </div>
  );
}

// Map Tab
function MapTab({ hike }: { hike: Hike }) {
  const routePoints = hike.route_points;
  const trail = hike.trail;
  const place = trail?.place;
  const location = place?.location;
  const offlineMapData = (hike.meta_data as any)?.offline_map_data;

  // Try to get coordinates
  let centerLat: number | null = null;
  let centerLng: number | null = null;

  if (location) {
    if (Array.isArray(location)) {
      centerLat = location[0];
      centerLng = location[1];
    } else if (typeof location === 'object') {
      centerLat = (location as any).lat || (location as any).latitude;
      centerLng = (location as any).lng || (location as any).longitude;
    }
  }

  // Convert route points to polyline format
  const polyline = routePoints?.map((point: any) => {
    if (Array.isArray(point)) {
      // Assume [lat, lng] or [lng, lat] format
      return { lat: point[0], lng: point[1] !== undefined ? point[1] : point[0] };
    }
    if (typeof point === 'object') {
      return { 
        lat: point.lat || point.latitude || point[0], 
        lng: point.lng || point.longitude || point[1] || point[0] 
      };
    }
    return null;
  }).filter((p: any): p is { lat: number; lng: number } => p !== null && typeof p.lat === 'number' && typeof p.lng === 'number') || [];

  // Calculate bounding box from route points or location
  let boundingBox: { north: number; south: number; east: number; west: number } | undefined;
  
  if (polyline.length > 0) {
    const lats = polyline.map(p => p.lat).filter(Boolean);
    const lngs = polyline.map(p => p.lng).filter(Boolean);
    if (lats.length > 0 && lngs.length > 0) {
      boundingBox = {
        north: Math.max(...lats) + 0.01,
        south: Math.min(...lats) - 0.01,
        east: Math.max(...lngs) + 0.01,
        west: Math.min(...lngs) - 0.01,
      };
    }
  } else if (centerLat && centerLng) {
    boundingBox = {
      north: centerLat + 0.05,
      south: centerLat - 0.05,
      east: centerLng + 0.05,
      west: centerLng - 0.05,
    };
  }

  // Extract POIs from discoveries or metadata
  const discoveries = hike.discoveries || [];
  const pois = discoveries.map((d: any) => ({
    lat: d.location?.lat || d.lat,
    lng: d.location?.lng || d.lng,
    name: d.description || d.type || 'POI',
    type: d.type || 'waypoint',
  })).filter((p: any) => p.lat && p.lng);

  // If we have route data or location, show map viewer
  if (boundingBox || polyline.length > 0 || centerLat) {
    // Get Google Maps API key from environment
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    return (
      <div className="space-y-6">
        <MapViewer
          trailId={hike.id}
          trailName={hike.trail?.name || 'Hike'}
          polyline={polyline.length > 0 ? polyline : undefined}
          pois={pois.length > 0 ? pois : undefined}
          boundingBox={boundingBox}
          zoomLevels={[10, 11, 12, 13, 14, 15]}
          googleMapsApiKey={googleMapsApiKey}
          metadata={{
            difficulty: hike.trail?.difficulty || undefined,
            region: hike.trail?.place?.name,
            elevation_range: hike.max_altitude_feet && hike.elevation_gain_feet ? {
              min: (hike.max_altitude_feet - hike.elevation_gain_feet),
              max: hike.max_altitude_feet,
            } : undefined,
          }}
        />

        {/* Route Points Info */}
        {routePoints && routePoints.length > 0 && (
          <div>
            <h3 className="text-xl font-light text-text mb-4">Route Information</h3>
            <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3' }}>
              <div className="text-sm text-textSecondary">
                <div className="mb-2">
                  <strong>GPS Points:</strong> {routePoints.length} recorded
                </div>
                {hike.distance_miles && (
                  <div className="mb-2">
                    <strong>Total Distance:</strong> {hike.distance_miles.toFixed(2)} miles
                  </div>
                )}
                {hike.start_time && hike.end_time && (
                  <div>
                    <strong>Duration:</strong> {format(parseISO(hike.start_time), 'MMM d, h:mm a')} - {format(parseISO(hike.end_time), 'h:mm a')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Legacy SVG Map */}
        {offlineMapData?.svg_code && (
          <div>
            <h3 className="text-xl font-light text-text mb-4">Trail Map (Legacy)</h3>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3' }}
              dangerouslySetInnerHTML={{ __html: offlineMapData.svg_code }}
            />
          </div>
        )}
      </div>
    );
  }

  // No map data available
  return (
    <EmptyState
      icon="🗺️"
      title="No map data"
      message="No route points, location, or offline map available for this hike"
    />
  );
}

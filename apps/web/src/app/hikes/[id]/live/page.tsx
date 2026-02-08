'use client';

/**
 * Hike Mode Live Page
 * Full-screen map experience with discovery-driven gamification
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import {
  HikeModeState,
  DiscoveryNode,
  DiscoveryCapture,
  Badge,
  DiscoveryNodeWithStatus,
  DISCOVERY_CATEGORIES,
} from '@/types/hikeMode';
import { HikeHUD } from '@/components/hike-mode/HikeHUD';
import { FieldGuideSheet } from '@/components/hike-mode/FieldGuideSheet';
import { CaptureDiscoverySheet } from '@/components/hike-mode/CaptureDiscoverySheet';
import { BadgeToast } from '@/components/hike-mode/BadgeToast';
import { NearbyToast } from '@/components/hike-mode/NearbyToast';
import { LiveCameraDiscovery } from '@/components/hike-mode/LiveCameraDiscovery';
import { DiscoveryQuest, generateQuestItems } from '@/components/hike-mode/DiscoveryQuest';
import { CheckpointSheet, TrailCheckpoint, CheckpointProgress } from '@/components/hike-mode/CheckpointSheet';
import { haversineDistanceMeters } from '@/lib/geoUtils';

// Dynamic import for map to avoid SSR issues
const HikeMapCanvas = dynamic(
  () => import('@/components/hike-mode/HikeMapCanvas').then(mod => mod.HikeMapCanvas),
  { ssr: false, loading: () => <MapLoadingState /> }
);

function MapLoadingState() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-mossGreen/20 to-pineGreen/30 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center mb-4 mx-auto animate-pulse">
          <span className="text-3xl">🗺️</span>
        </div>
        <p className="text-pineGreen font-medium">Loading map...</p>
      </div>
    </div>
  );
}

// Nearby detection radius in meters
const NEARBY_RADIUS_METERS = 100;

export default function HikeModeLivePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hikeId = params.id as string;

  // Core state
  const [state, setState] = useState<HikeModeState>({
    hikeId,
    trailId: '',
    trailName: '',
    parkId: '',
    parkName: '',
    status: 'loading',
    startTime: null,
    elapsedSeconds: 0,
    distanceMeters: 0,
    elevationGainMeters: 0,
    paceMinPerKm: null,
    currentLocation: null,
    routePoints: [],
    discoveryNodes: [],
    captures: [],
    nearbyNodes: [],
    earnedBadges: [],
  });

  // UI state
  const [fieldGuideOpen, setFieldGuideOpen] = useState(false);
  const [captureSheetOpen, setCaptureSheetOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<DiscoveryNode | null>(null);
  const [showBadgeToast, setShowBadgeToast] = useState(false);
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);
  const [nearbyToastNode, setNearbyToastNode] = useState<DiscoveryNode | null>(null);
  const [mapLayer, setMapLayer] = useState<'topo' | 'satellite' | 'terrain'>('topo');
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trailCenter, setTrailCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [trailBounds, setTrailBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [trailRoute, setTrailRoute] = useState<Array<[number, number]>>([]);  // [lng, lat] GeoJSON format
  
  // Camera Discovery state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [questOpen, setQuestOpen] = useState(false);
  const [questItems, setQuestItems] = useState<any[]>([]);
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  
  // Navigation state
  const [navigationUrl, setNavigationUrl] = useState<string | null>(null);
  
  // Checkpoint state
  const [checkpoints, setCheckpoints] = useState<TrailCheckpoint[]>([]);
  const [checkpointProgress, setCheckpointProgress] = useState<Record<string, CheckpointProgress>>({});
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<TrailCheckpoint | null>(null);
  const [checkpointSheetOpen, setCheckpointSheetOpen] = useState(false);
  const [nearbyCheckpoints, setNearbyCheckpoints] = useState<TrailCheckpoint[]>([]);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const locationWatchRef = useRef<number | null>(null);
  const previousLocation = useRef<{ lat: number; lng: number } | null>(null);
  const shownNearbyIds = useRef<Set<string>>(new Set());

  // =============================================
  // INITIALIZATION
  // =============================================

  useEffect(() => {
    loadHikeData();
    return () => cleanup();
  }, [hikeId]);

  const loadHikeData = async () => {
    try {
      // Load hike details
      const hikeResponse = await api.get(`/api/v1/hikes/${hikeId}`);
      const hike = hikeResponse.data;

      const trailId = hike.trail_id || hike.trail?.id || '';
      const trailName = hike.trail?.name || hike.trail_name || 'Trail';
      const parkId = hike.place_id || hike.trail?.place_id || '';
      const parkName = hike.place?.name || hike.park_name || '';

      // Extract trail center coordinates (NO hard-coded defaults).
      const qpLatRaw = searchParams?.get('lat');
      const qpLngRaw = searchParams?.get('lng');
      const qpLat = qpLatRaw ? Number(qpLatRaw) : NaN;
      const qpLng = qpLngRaw ? Number(qpLngRaw) : NaN;

      let centerLat: number | null = Number.isFinite(qpLat) ? qpLat : null;
      let centerLng: number | null = Number.isFinite(qpLng) ? qpLng : null;

      // Fallbacks (for deep-links) — still no hard-coded city:
      if ((centerLat === null || centerLng === null) && hike.trail?.meta_data) {
        const m = hike.trail.meta_data;
        const mLat = m.trailhead_lat ?? m.lat ?? m.latitude;
        const mLng = m.trailhead_lng ?? m.lng ?? m.longitude;
        const pLat = mLat !== undefined ? Number(mLat) : NaN;
        const pLng = mLng !== undefined ? Number(mLng) : NaN;
        if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
          centerLat = pLat;
          centerLng = pLng;
        }
      }
      if ((centerLat === null || centerLng === null) && hike.place?.location) {
        const loc = hike.place.location;
        const pLat = Number(loc?.lat ?? loc?.latitude);
        const pLng = Number(loc?.lng ?? loc?.longitude);
        if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
          centerLat = pLat;
          centerLng = pLng;
        }
      }

      if (centerLat === null || centerLng === null) {
        setError('Unable to load trail location. Please try again.');
        setState(prev => ({ ...prev, status: 'loading' }));
        return;
      }

      console.log('[HikeMode] Trail center:', centerLat, centerLng);
      setTrailCenter({ lat: centerLat, lng: centerLng });

      // Load trail bounds (for zoom-to-trail) if available
      if (trailId) {
        try {
          const routeRes = await api.get(`/api/v1/trails/${trailId}/route`);
          const bounds = routeRes.data?.bounds;
          if (
            bounds &&
            typeof bounds.north === 'number' &&
            typeof bounds.south === 'number' &&
            typeof bounds.east === 'number' &&
            typeof bounds.west === 'number'
          ) {
            setTrailBounds(bounds);
          }
          // Store the trail route coordinates for display
          const geojson = routeRes.data?.geojson;
          if (geojson && geojson.coordinates && Array.isArray(geojson.coordinates)) {
            setTrailRoute(geojson.coordinates);
            console.log('[HikeMode] Trail route loaded with', geojson.coordinates.length, 'points');
          }
        } catch (e) {
          // Non-fatal
          console.warn('[HikeMode] Failed to load trail route:', e);
        }
      }

      // Load navigation data for Google Maps
      if (trailId) {
        try {
          const navResponse = await api.get(`/api/v1/trails/${trailId}/navigation`);
          setNavigationUrl(navResponse.data.google_maps_url);
          console.log('[HikeMode] Navigation URL loaded');
        } catch (err) {
          console.warn('[HikeMode] Navigation data unavailable');
        }
      }

      // Bootstrap discoveries for this hike
      let discoveries: DiscoveryNode[] = [];
      try {
        const discResponse = await api.post(`/api/v1/hikes/${hikeId}/discoveries/bootstrap`);
        discoveries = discResponse.data?.nodes || [];
        console.log('[HikeMode] Loaded', discoveries.length, 'discoveries');
      } catch (err) {
        console.warn('[HikeMode] Discovery bootstrap failed, using fallback');
        discoveries = generateFallbackDiscoveries(trailId, centerLat, centerLng);
      }

      setState(prev => ({
        ...prev,
        trailId,
        trailName,
        parkId,
        parkName,
        discoveryNodes: discoveries,
        status: 'ready',
        startTime: Date.now(),
      }));

      // Load quest items from species hints API
      try {
        const hintsResponse = await api.post('/api/v1/vision/species-hints', {
          location: { lat: centerLat, lng: centerLng },
        });
        if (hintsResponse.data?.hints) {
          setQuestItems(generateQuestItems(trailId, trailName, hintsResponse.data.hints));
        } else {
          // Fallback quest items
          setQuestItems(generateQuestItems(trailId, trailName, [
            { name: 'Oak Tree', category: 'plant', likelihood: 'high', hint: 'Look for distinctive lobed leaves', xp: 20 },
            { name: 'Songbird', category: 'bird', likelihood: 'high', hint: 'Listen for melodic calls in trees', xp: 25 },
            { name: 'Wildflower', category: 'plant', likelihood: 'medium', hint: 'Check sunny clearings', xp: 30 },
            { name: 'Deer', category: 'animal', likelihood: 'medium', hint: 'Watch meadows at dawn/dusk', xp: 45 },
            { name: 'Hawk', category: 'bird', likelihood: 'low', hint: 'Scan the sky near ridges', xp: 65 },
          ]));
        }
      } catch (err) {
        console.warn('[HikeMode] Failed to load quest hints, using defaults');
        setQuestItems(generateQuestItems(trailId, trailName, [
          { name: 'Oak Tree', category: 'plant', likelihood: 'high', hint: 'Look for distinctive lobed leaves', xp: 20 },
          { name: 'Songbird', category: 'bird', likelihood: 'high', hint: 'Listen for melodic calls in trees', xp: 25 },
          { name: 'Wildflower', category: 'plant', likelihood: 'medium', hint: 'Check sunny clearings', xp: 30 },
        ]));
      }

      // Load trail checkpoints
      if (trailId) {
        try {
          const checkpointsResponse = await api.get(`/api/v1/trails/${trailId}/checkpoints`);
          if (checkpointsResponse.data?.checkpoints) {
            setCheckpoints(checkpointsResponse.data.checkpoints);
            console.log('[HikeMode] Loaded', checkpointsResponse.data.checkpoints.length, 'checkpoints');
          }
        } catch (err) {
          console.warn('[HikeMode] Failed to load checkpoints');
        }
        
        // Load checkpoint progress
        try {
          const progressResponse = await api.get(`/api/v1/hikes/${hikeId}/checkpoint-progress`);
          if (progressResponse.data?.progress) {
            const progressMap: Record<string, CheckpointProgress> = {};
            progressResponse.data.progress.forEach((p: any) => {
              progressMap[p.checkpoint_id] = p;
            });
            setCheckpointProgress(progressMap);
          }
        } catch (err) {
          console.warn('[HikeMode] Failed to load checkpoint progress');
        }
      }

      // Start tracking (but don't auto-center on user)
      startLocationTracking();
      startTimer();

    } catch (err: any) {
      console.error('[HikeMode] Failed to load hike:', err);
      setError(err.message || 'Failed to load hike data');
      setState(prev => ({ ...prev, status: 'loading' }));
    }
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (locationWatchRef.current && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
    }
  };

  // =============================================
  // LOCATION TRACKING
  // =============================================

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      console.warn('[HikeMode] Geolocation not available');
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => handleLocationUpdate(pos),
      (err) => console.warn('[HikeMode] Initial location error:', err),
      { enableHighAccuracy: true }
    );

    // Watch position
    locationWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => handleLocationUpdate(pos),
      (err) => console.warn('[HikeMode] Location watch error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  const handleLocationUpdate = (position: GeolocationPosition) => {
    const newLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    // Calculate distance from previous point
    let addedDistance = 0;
    if (previousLocation.current) {
      addedDistance = haversineDistanceMeters(previousLocation.current, newLocation);
    }
    previousLocation.current = newLocation;

    setState(prev => {
      const newRoutePoints = [
        ...prev.routePoints,
        { ...newLocation, timestamp: Date.now() }
      ];

      // Check for nearby discoveries
      const nearby = prev.discoveryNodes.filter(node => {
        const dist = haversineDistanceMeters(newLocation, { lat: node.lat, lng: node.lng });
        return dist <= NEARBY_RADIUS_METERS;
      });

      // Show toast for newly nearby nodes
      nearby.forEach(node => {
        if (!shownNearbyIds.current.has(node.id) && !prev.captures.some(c => c.nodeId === node.id)) {
          shownNearbyIds.current.add(node.id);
          setNearbyToastNode(node);
          setTimeout(() => setNearbyToastNode(null), 4000);
        }
      });

      // Check for nearby checkpoints
      const nearbyCheckpointsTemp = checkpoints.filter(cp => {
        const dist = haversineDistanceMeters(newLocation, { lat: cp.location.lat, lng: cp.location.lng });
        return dist <= 50; // 50 meters for checkpoints
      });
      if (nearbyCheckpointsTemp.length !== nearbyCheckpoints.length) {
        setNearbyCheckpoints(nearbyCheckpointsTemp);
        
        // Auto-reach checkpoint
        nearbyCheckpointsTemp.forEach(async (cp) => {
          if (!checkpointProgress[cp.id]?.reached_at) {
            try {
              await api.post(`/api/v1/hikes/${hikeId}/checkpoints/${cp.id}/reach`, {
                location: newLocation
              });
              setCheckpointProgress(prev => ({
                ...prev,
                [cp.id]: {
                  checkpoint_id: cp.id,
                  activities_completed: [],
                  xp_earned: 0,
                  reached_at: new Date().toISOString()
                }
              }));
            } catch (err) {
              console.warn('Failed to reach checkpoint:', err);
            }
          }
        });
      }

      return {
        ...prev,
        currentLocation: newLocation,
        routePoints: newRoutePoints,
        distanceMeters: prev.distanceMeters + addedDistance,
        nearbyNodes: nearby,
      };
    });
  };

  // =============================================
  // TIMER
  // =============================================

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      if (!isPaused) {
        setState(prev => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
      }
    }, 1000);
  };

  // =============================================
  // DISCOVERY CAPTURE
  // =============================================

  const handleOpenCapture = (node?: DiscoveryNode) => {
    if (node) {
      setSelectedNode(node);
    }
    setCaptureSheetOpen(true);
  };

  const handleCapture = async (
    nodeId: string,
    category: string,
    photoFile: File | null,
    note: string,
    confidence: number
  ) => {
    try {
      const formData = new FormData();
      formData.append('node_id', nodeId);
      formData.append('category', category);
      formData.append('note', note);
      formData.append('confidence', confidence.toString());
      if (photoFile) {
        formData.append('photo', photoFile);
      }
      if (state.currentLocation) {
        formData.append('lat', state.currentLocation.lat.toString());
        formData.append('lng', state.currentLocation.lng.toString());
      }

      const response = await api.post(`/api/v1/hikes/${hikeId}/discoveries/capture`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const capture: DiscoveryCapture = response.data.capture || {
        id: `capture-${Date.now()}`,
        nodeId,
        hikeId,
        userId: 'current',
        capturedAt: new Date().toISOString(),
        note,
        confidence,
        location: state.currentLocation || { lat: 0, lng: 0 },
      };

      // Update state
      setState(prev => ({
        ...prev,
        captures: [...prev.captures, capture],
      }));

      // Check for badges
      const newBadges: Badge[] = response.data.badges || [];
      if (newBadges.length > 0) {
        showBadgeAward(newBadges[0]);
      } else {
        // Check locally for first capture badge
        if (state.captures.length === 0) {
          showBadgeAward({
            id: `badge-${Date.now()}`,
            type: 'first_capture',
            name: 'First Discovery',
            description: 'Made your first discovery!',
            icon: '⭐',
            xp: 50,
            earnedAt: new Date().toISOString(),
          });
        }
      }

      setCaptureSheetOpen(false);
      setSelectedNode(null);

    } catch (err: any) {
      console.error('[HikeMode] Capture failed:', err);
      // Still update locally
      const localCapture: DiscoveryCapture = {
        id: `local-${Date.now()}`,
        nodeId,
        hikeId,
        userId: 'current',
        capturedAt: new Date().toISOString(),
        note,
        confidence,
        location: state.currentLocation || { lat: 0, lng: 0 },
      };
      setState(prev => ({
        ...prev,
        captures: [...prev.captures, localCapture],
      }));
      setCaptureSheetOpen(false);
      setSelectedNode(null);
    }
  };

  const showBadgeAward = (badge: Badge) => {
    setCurrentBadge(badge);
    setShowBadgeToast(true);
    setState(prev => ({
      ...prev,
      earnedBadges: [...prev.earnedBadges, badge],
    }));
    setTimeout(() => setShowBadgeToast(false), 4000);
  };

  // =============================================
  // HIKE CONTROLS
  // =============================================

  const handlePause = () => {
    setIsPaused(!isPaused);
    setState(prev => ({
      ...prev,
      status: isPaused ? 'active' : 'paused',
    }));
  };

  // Camera discovery callback
  const handleCameraDiscovery = (discovery: any, xpEarned: number) => {
    setTotalXpEarned(prev => prev + xpEarned);
    
    // Check if discovery matches a quest item
    const discoveryName = discovery.name.toLowerCase();
    setQuestItems(prev => prev.map(item => {
      if (!item.completed && discoveryName.includes(item.name.toLowerCase())) {
        return { ...item, completed: true };
      }
      return item;
    }));

    // Show badge if first camera discovery
    if (state.captures.length === 0) {
      showBadgeAward({
        id: `badge-camera-${Date.now()}`,
        type: 'camera_discovery',
        name: 'Nature Photographer',
        description: 'Made your first camera discovery!',
        icon: '📸',
        xp: 50,
        earnedAt: new Date().toISOString(),
      });
    }
  };

  // Quest item click - opens camera to find it
  const handleQuestItemClick = (item: any) => {
    setCameraOpen(true);
    setQuestOpen(false);
  };

  // Checkpoint activity completion
  const handleActivityComplete = async (activityId: string, proof: any) => {
    if (!selectedCheckpoint) return;
    
    try {
      const response = await api.post(
        `/api/v1/hikes/${hikeId}/checkpoints/${selectedCheckpoint.id}/complete-activity`,
        {
          activity_id: activityId,
          proof: proof
        }
      );
      
      // Update local progress
      if (response.data?.checkpoint_progress) {
        setCheckpointProgress(prev => ({
          ...prev,
          [selectedCheckpoint.id]: response.data.checkpoint_progress
        }));
      }
      
      // Show badge or XP notification
      const activity = selectedCheckpoint.activities.find(a => a.id === activityId);
      if (activity) {
        setTotalXpEarned(prev => prev + activity.xp);
      }
    } catch (err) {
      console.error('Failed to complete activity:', err);
      throw err;
    }
  };

  const handleStop = async () => {
    if (!confirm('End this hike?')) return;

    try {
      await api.post(`/api/v1/hikes/${hikeId}/complete`, {
        distance_meters: state.distanceMeters,
        duration_seconds: state.elapsedSeconds,
        elevation_gain_meters: state.elevationGainMeters,
        captures: state.captures.length,
        route_points: state.routePoints,
      });
    } catch (err) {
      console.warn('[HikeMode] Complete API failed, continuing to summary');
    }

    cleanup();
    router.push(`/hikes/${hikeId}/summary`);
  };

  // =============================================
  // HELPERS
  // =============================================

  const getNodesWithStatus = useCallback((): DiscoveryNodeWithStatus[] => {
    if (!state.currentLocation) {
      return state.discoveryNodes.map(node => ({
        ...node,
        distanceMeters: 9999,
        status: 'far' as const,
      }));
    }

    return state.discoveryNodes.map(node => {
      const dist = haversineDistanceMeters(state.currentLocation!, { lat: node.lat, lng: node.lng });
      const isCaptured = state.captures.some(c => c.nodeId === node.id);
      
      let status: 'discovered' | 'nearby' | 'captured' | 'far' = 'far';
      if (isCaptured) status = 'captured';
      else if (dist <= NEARBY_RADIUS_METERS) status = 'nearby';
      else if (dist <= 500) status = 'discovered';

      return { ...node, distanceMeters: dist, status };
    }).sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [state.currentLocation, state.discoveryNodes, state.captures]);

  const nearbyCount = state.nearbyNodes.filter(
    n => !state.captures.some(c => c.nodeId === n.id)
  ).length;

  const capturedCount = state.captures.length;

  // =============================================
  // RENDER
  // =============================================

  if (error) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="font-display text-2xl text-pineGreen mb-2">Something went wrong</h1>
          <p className="text-textSecondary mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-pineGreen text-white rounded-full font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-mossGreen/20 flex items-center justify-center mb-4 mx-auto animate-pulse">
            <span className="text-4xl">🥾</span>
          </div>
          <h1 className="font-display text-2xl text-pineGreen mb-2">Preparing Your Hike</h1>
          <p className="text-textSecondary">Loading trail data and discoveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Full-screen Map */}
      {trailCenter ? (
        <HikeMapCanvas
          trailCenter={trailCenter}
          trailBounds={trailBounds}
          currentLocation={state.currentLocation}
          routePoints={state.routePoints}
          discoveryNodes={getNodesWithStatus()}
          captures={state.captures}
          mapLayer={mapLayer}
          onNodeClick={handleOpenCapture}
          onCenterMe={() => {
            // Map will handle centering
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-mossGreen/20 to-pineGreen/30 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center mb-4 mx-auto animate-pulse">
              <span className="text-3xl">🥾</span>
            </div>
            <p className="text-pineGreen font-medium">Preparing your hike...</p>
          </div>
        </div>
      )}

      {/* Top Left: Finds Pill */}
      <button
        onClick={() => setFieldGuideOpen(true)}
        className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg flex items-center gap-2 hover:bg-white transition-colors"
        style={{ zIndex: 100 }}
      >
        <span className="text-lg">🔍</span>
        <span className="text-sm font-medium text-pineGreen">
          {nearbyCount > 0 && <span className="text-discoveryGold">{nearbyCount} nearby</span>}
          {nearbyCount > 0 && capturedCount > 0 && ' · '}
          {capturedCount > 0 && <span className="text-mossGreen">{capturedCount} captured</span>}
          {nearbyCount === 0 && capturedCount === 0 && 'Field Guide'}
        </span>
      </button>

      {/* Top Right: Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2" style={{ zIndex: 100 }}>
        {/* Difficulty Badge */}
        <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
          <span className="text-xs font-medium text-textSecondary">{state.trailName}</span>
        </div>

        {/* Google Maps Navigation Button */}
        {navigationUrl && (
          <button
            onClick={() => window.open(navigationUrl, '_blank')}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg p-3 flex items-center gap-2 transition-colors"
            title="Open in Google Maps"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
            <span className="text-xs font-medium">Navigate</span>
          </button>
        )}

        {/* Map Layer Toggle */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-1 flex flex-col gap-1">
          {(['topo', 'satellite', 'terrain'] as const).map(layer => (
            <button
              key={layer}
              onClick={() => setMapLayer(layer)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors ${
                mapLayer === layer ? 'bg-pineGreen text-white' : 'hover:bg-gray-100'
              }`}
              title={layer.charAt(0).toUpperCase() + layer.slice(1)}
            >
              {layer === 'topo' ? '🗺️' : layer === 'satellite' ? '🛰️' : '⛰️'}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom HUD */}
      <HikeHUD
        elapsedSeconds={state.elapsedSeconds}
        distanceMeters={state.distanceMeters}
        elevationGainMeters={state.elevationGainMeters}
        paceMinPerKm={state.paceMinPerKm}
        isPaused={isPaused}
        onPause={handlePause}
        onDiscover={() => handleOpenCapture()}
        onStop={handleStop}
      />

      {/* Field Guide Sheet */}
      <FieldGuideSheet
        isOpen={fieldGuideOpen}
        onClose={() => setFieldGuideOpen(false)}
        nodes={getNodesWithStatus()}
        captures={state.captures}
        onNodeSelect={(node) => {
          setSelectedNode(node);
          setFieldGuideOpen(false);
          handleOpenCapture(node);
        }}
      />

      {/* Capture Discovery Sheet */}
      <CaptureDiscoverySheet
        isOpen={captureSheetOpen}
        onClose={() => {
          setCaptureSheetOpen(false);
          setSelectedNode(null);
        }}
        selectedNode={selectedNode}
        nearbyNodes={state.nearbyNodes}
        onCapture={handleCapture}
      />

      {/* Badge Toast */}
      <BadgeToast
        badge={currentBadge}
        visible={showBadgeToast}
        onHide={() => setShowBadgeToast(false)}
      />

      {/* Nearby Discovery Toast */}
      <NearbyToast
        node={nearbyToastNode}
        onCapture={() => {
          if (nearbyToastNode) {
            handleOpenCapture(nearbyToastNode);
            setNearbyToastNode(null);
          }
        }}
        onDismiss={() => setNearbyToastNode(null)}
      />

      {/* Live Camera Discovery */}
      <LiveCameraDiscovery
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        hikeId={hikeId}
        currentLocation={state.currentLocation || undefined}
        onDiscoveryMade={handleCameraDiscovery}
      />

      {/* Quest Sheet */}
      {questOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end">
          <div className="w-full max-h-[80vh] overflow-y-auto bg-background rounded-t-3xl animate-slide-up">
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm p-4 flex justify-between items-center border-b border-gray-200">
              <h2 className="font-display text-xl text-pineGreen">Trail Quest</h2>
              <button
                onClick={() => setQuestOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <DiscoveryQuest
                trailName={state.trailName}
                questItems={questItems}
                totalXp={questItems.reduce((sum, item) => sum + item.xp, 0) + 100}
                earnedXp={totalXpEarned + questItems.filter(i => i.completed).reduce((sum, i) => sum + i.xp, 0)}
                completionBonus={100}
                onItemClick={handleQuestItemClick}
              />
            </div>
          </div>
        </div>
      )}

      {/* Checkpoint Sheet */}
      {checkpointSheetOpen && selectedCheckpoint && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end" onClick={() => setCheckpointSheetOpen(false)}>
          <div className="w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-background/95 backdrop-blur-sm p-4 flex justify-between items-center border-b border-gray-200">
              <h2 className="font-display text-xl text-pineGreen">Checkpoint {selectedCheckpoint.sequence}</h2>
              <button
                onClick={() => setCheckpointSheetOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <CheckpointSheet
              checkpoint={selectedCheckpoint}
              isNearby={nearbyCheckpoints.some(cp => cp.id === selectedCheckpoint.id)}
              progress={checkpointProgress[selectedCheckpoint.id] || {
                checkpoint_id: selectedCheckpoint.id,
                activities_completed: [],
                xp_earned: 0
              }}
              onActivityComplete={handleActivityComplete}
            />
          </div>
        </div>
      )}

      {/* Camera FAB - Pokemon Go style */}
      <button
        onClick={() => setCameraOpen(true)}
        className="absolute left-1/2 -translate-x-1/2 bottom-[180px] w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
        style={{ zIndex: 110, boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)' }}
      >
        <span className="text-2xl">📷</span>
      </button>

      {/* Quest FAB */}
      <button
        onClick={() => setQuestOpen(true)}
        className="absolute left-4 bottom-[250px] w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        style={{ zIndex: 110 }}
      >
        <span className="text-xl">🎯</span>
        {questItems.filter(i => !i.completed).length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">
            {questItems.filter(i => !i.completed).length}
          </span>
        )}
      </button>

      {/* Checkpoints FAB */}
      {checkpoints.length > 0 && (
        <button
          onClick={() => {
            // Show checkpoint list or nearest checkpoint
            if (nearbyCheckpoints.length > 0) {
              setSelectedCheckpoint(nearbyCheckpoints[0]);
              setCheckpointSheetOpen(true);
            } else if (checkpoints.length > 0) {
              setSelectedCheckpoint(checkpoints[0]);
              setCheckpointSheetOpen(true);
            }
          }}
          className="absolute left-4 bottom-[185px] w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          style={{ zIndex: 110 }}
        >
          <span className="text-xl">🎪</span>
          {nearbyCheckpoints.length > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full text-xs font-bold flex items-center justify-center">
              {nearbyCheckpoints.length}
            </span>
          )}
        </button>
      )}

      {/* Pause Overlay */}
      {isPaused && (
        <div className="absolute inset-0 z-30 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 text-center max-w-sm mx-4">
            <div className="text-5xl mb-4">⏸️</div>
            <h2 className="font-display text-2xl text-pineGreen mb-2">Hike Paused</h2>
            <p className="text-textSecondary mb-6">Take a break. Your progress is saved.</p>
            <button
              onClick={handlePause}
              className="w-full py-3 bg-pineGreen text-white rounded-full font-medium"
            >
              Resume Hike
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback discoveries when API fails
function generateFallbackDiscoveries(trailId: string, baseLat: number = 37.8914, baseLng: number = -122.5811): DiscoveryNode[] {
  // Use provided coordinates or default to Muir Woods
  
  const discoveries: DiscoveryNode[] = [
    {
      id: `${trailId}-disc-1`,
      hikeId: '',
      trailId,
      title: 'Ancient Oak Grove',
      category: 'plant',
      lat: baseLat + 0.002,
      lng: baseLng + 0.001,
      shortFact: 'These coast live oaks are over 200 years old and provide habitat for dozens of bird species.',
      rarity: 'common',
      xp: 20,
      source: 'curated',
    },
    {
      id: `${trailId}-disc-2`,
      hikeId: '',
      trailId,
      title: 'Serpentine Outcrop',
      category: 'geology',
      lat: baseLat + 0.004,
      lng: baseLng + 0.002,
      shortFact: 'This blue-green rock contains minerals that support unique plant communities found nowhere else.',
      rarity: 'uncommon',
      xp: 35,
      source: 'curated',
    },
    {
      id: `${trailId}-disc-3`,
      hikeId: '',
      trailId,
      title: 'Historic Trail Marker',
      category: 'history',
      lat: baseLat + 0.003,
      lng: baseLng - 0.001,
      shortFact: 'This stone marker was placed in 1923 by the Civilian Conservation Corps.',
      rarity: 'rare',
      xp: 50,
      source: 'curated',
    },
    {
      id: `${trailId}-disc-4`,
      hikeId: '',
      trailId,
      title: 'Valley Overlook',
      category: 'viewpoint',
      lat: baseLat + 0.005,
      lng: baseLng + 0.003,
      shortFact: 'On clear days, you can see the city skyline from this 800-foot elevation point.',
      rarity: 'common',
      xp: 25,
      source: 'curated',
    },
    {
      id: `${trailId}-disc-5`,
      hikeId: '',
      trailId,
      title: 'Seasonal Creek',
      category: 'water',
      lat: baseLat + 0.001,
      lng: baseLng + 0.004,
      shortFact: 'This creek flows from November to May, supporting salamanders and native fish.',
      rarity: 'common',
      xp: 20,
      source: 'curated',
    },
  ];

  return discoveries;
}

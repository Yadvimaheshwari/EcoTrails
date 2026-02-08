'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDashboardStats,
  findNearbyPlaces,
  searchPlaces,
  getPlaceTrails,
} from '@/lib/api';
import { transformTrails } from '@/lib/trailTransform';

// Components
import { ExploreHeaderIdentity } from '@/components/explore/ExploreHeaderIdentity';
import { ExploreSearch } from '@/components/explore/ExploreSearch';
import { ExploreQuickExplore } from '@/components/explore/ExploreQuickExplore';
import { ExploreNearbyTrails } from '@/components/explore/ExploreNearbyTrails';
import { ExploreContextStrip } from '@/components/explore/ExploreContextStrip';
import { ExploreSearchResults } from '@/components/explore/ExploreSearchResults';
import { ExploreContinue } from '@/components/explore/ExploreContinue';

interface DashboardStats {
  parks_explored: number;
  trails_completed: number;
  elevation_gained_feet: number;
  rare_discoveries: number;
  explorer_level: string;
  next_milestone: string;
  next_milestone_points: number;
  current_points: number;
  recent_activity: Array<{
    id: string;
    trail_name: string;
    place_name: string;
    status: string;
    date: string | null;
    distance_miles: number | null;
  }>;
  active_hikes: number;
}

// Normalize placeId to prevent /places/undefined
function normalizePlace(place: any): any | null {
  const placeId = place?.id || place?.place_id || place?.google_place_id;
  
  // Validate: must exist and not be "undefined" string
  if (!placeId || placeId === 'undefined' || placeId === 'null') {
    console.warn('[Explore] Invalid place ID detected, filtering out:', place?.name);
    return null;
  }
  
  return {
    ...place,
    id: placeId, // Normalize to `id` field
  };
}

export default function ExplorePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Search State
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [typeaheadResults, setTypeaheadResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Data State
  const [userStats, setUserStats] = useState<DashboardStats | null>(null);
  const [nearbyTrails, setNearbyTrails] = useState<any[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [loadingTrails, setLoadingTrails] = useState(true);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [realActiveHike, setRealActiveHike] = useState<any>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load user stats
  useEffect(() => {
    if (!user) return;
    loadStats();
    loadActiveHike();
  }, [user]);

  // Load active hike from API
  const loadActiveHike = async () => {
    try {
      // Use axios client so Authorization is consistent (prevents 401s)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/hikes/active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.id) {
          // Format elapsed time
          let elapsedTime = '';
          if (data.start_time) {
            const startTime = new Date(data.start_time).getTime();
            const elapsed = Date.now() - startTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            if (hours > 0) {
              elapsedTime = `${hours}h ${minutes}m`;
            } else {
              elapsedTime = `${minutes}m`;
            }
          }
          
          setRealActiveHike({
            id: data.id,
            trailName: data.trail?.name || data.meta_data?.trail_name || 'Active Hike',
            parkName: data.place?.name || data.meta_data?.park_name || '',
            elapsedTime,
          });
        }
      }
    } catch (err) {
      console.log('[Explore] No active hike found');
    }
  };

  // Load nearby trails on mount
  useEffect(() => {
    if (!user) return;
    loadNearbyTrails();
  }, [user]);

  // Typeahead search while typing
  useEffect(() => {
    if (!query.trim()) {
      setTypeaheadResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        let searchQuery = query.trim();
        const parkKeywords = ['national park', 'state park', 'national monument', 'national forest'];
        const hasParkKeyword = parkKeywords.some(keyword =>
          searchQuery.toLowerCase().includes(keyword)
        );

        if (!hasParkKeyword && searchQuery.length > 2) {
          searchQuery = `${searchQuery} national park OR state park USA`;
        }

        if (searchQuery.length > 2) {
          const placesRes = await searchPlaces(searchQuery, 5);

          let placesArray: any[] = [];
          if (placesRes.data) {
            if (Array.isArray(placesRes.data.places)) {
              placesArray = placesRes.data.places;
            } else if (Array.isArray(placesRes.data)) {
              placesArray = placesRes.data;
            }

            // Normalize and filter invalid places – accept anything with 'park' in name/type
            placesArray = placesArray
              .map(normalizePlace)
              .filter((p: any): p is NonNullable<typeof p> => p !== null)
              .filter((place: any) => {
                const name = (place.name || '').toLowerCase();
                const type = (place.place_type || place.type || '').toLowerCase();
                const vicinity = (place.vicinity || place.formatted_address || place.description || '').toLowerCase();
                const types = (place.types || []).join(' ').toLowerCase();
                return (
                  name.includes('park') ||
                  name.includes('national monument') ||
                  name.includes('national forest') ||
                  name.includes('trail') ||
                  name.includes('recreation') ||
                  type.includes('park') ||
                  types.includes('park') ||
                  vicinity.includes('park')
                );
              })
              .slice(0, 5);
          }

          setTypeaheadResults(placesArray);
        }
      } catch (error) {
        console.error('[Explore] Typeahead search failed:', error);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle Escape key to clear search
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearResults();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const loadStats = async () => {
    try {
      const response = await getDashboardStats();
      setUserStats(response.data);
    } catch (error) {
      console.error('[Explore] Failed to load stats:', error);
      // Set default stats
      setUserStats({
        parks_explored: 0,
        trails_completed: 0,
        elevation_gained_feet: 0,
        rare_discoveries: 0,
        explorer_level: 'Adventurer',
        next_milestone: 'Complete your first trail',
        next_milestone_points: 100,
        current_points: 0,
        recent_activity: [],
        active_hikes: 0,
      });
    }
  };

  const loadNearbyTrails = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationError('Location services are not supported by your browser');
      setLoadingTrails(false);
      setRequestingLocation(false);
      return;
    }

    setRequestingLocation(true);
    setLocationError(null);
    setLoadingTrails(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({ lat, lng });

        console.log('[Explore] User location:', { lat, lng });

        try {
          // Use 50km (31 miles) radius for better coverage
          const radiusMiles = 31;
          const response = await findNearbyPlaces(lat, lng, radiusMiles, 10);
          
          console.log('[Explore] Nearby places response:', response.data);

          // Handle both response formats: { places: [...] } and direct array
          const rawPlaces = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.data?.places)
              ? response.data.places
              : [];

          if (rawPlaces.length > 0 || response.data) {
            // Normalize and filter places
            const validPlaces = rawPlaces
              .map(normalizePlace)
              .filter((p: any): p is NonNullable<typeof p> => p !== null);
            
            setNearbyPlaces(validPlaces);
            
            // Transform places to trail format and flatten
            const allTrails: any[] = [];
            for (const place of validPlaces.slice(0, 3)) {
              try {
                if (place.id) {
                  console.log('[Explore] Loading trails for place:', place.id, place.name);
                  const trailsResponse = await getPlaceTrails(place.id);
                  if (trailsResponse.data && Array.isArray(trailsResponse.data)) {
                    const transformed = transformTrails(trailsResponse.data, place.name);
                    allTrails.push(...transformed.slice(0, 2)); // Take top 2 trails per park
                  }
                }
              } catch (error) {
                console.error('[Explore] Failed to load trails for place:', place.name, error);
              }
            }
            
            setNearbyTrails(allTrails.slice(0, 6)); // Show max 6 trails
            setLocationError(null);
          }
        } catch (error) {
          console.error('[Explore] Failed to load nearby places:', error);
          setLocationError('Failed to load nearby trails. Please try again.');
        } finally {
          setLoadingTrails(false);
          setRequestingLocation(false);
        }
      },
      (error) => {
        console.error('[Explore] Geolocation error:', error);
        let errorMessage = 'Unable to access your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }
        
        setLocationError(errorMessage);
        setLoadingTrails(false);
        setRequestingLocation(false);
      },
      {
        timeout: 10000,
        enableHighAccuracy: true,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      clearResults();
      return;
    }

    setSearching(true);
    try {
      let enhancedQuery = searchQuery.trim();
      const parkKeywords = ['national park', 'state park', 'national monument', 'national forest'];
      const hasParkKeyword = parkKeywords.some(keyword =>
        enhancedQuery.toLowerCase().includes(keyword)
      );

      if (!hasParkKeyword) {
        enhancedQuery = `${enhancedQuery} national park OR state park USA`;
      }

      const placesRes = await searchPlaces(enhancedQuery);

      let placesArray: any[] = [];
      if (placesRes.data) {
        if (Array.isArray(placesRes.data.places)) {
          placesArray = placesRes.data.places;
        } else if (Array.isArray(placesRes.data)) {
          placesArray = placesRes.data;
        }

        // Normalize and filter – accept any park, trail, recreation area, etc.
        placesArray = placesArray
          .map(normalizePlace)
          .filter((p: any): p is NonNullable<typeof p> => p !== null)
          .filter((place: any) => {
            const name = (place.name || '').toLowerCase();
            const type = (place.place_type || place.type || '').toLowerCase();
            const description = (place.description || '').toLowerCase();
            const types = (place.types || []).join(' ').toLowerCase();

            return (
              name.includes('park') ||
              name.includes('national monument') ||
              name.includes('national forest') ||
              name.includes('trail') ||
              name.includes('recreation') ||
              name.includes('wilderness') ||
              type.includes('park') ||
              types.includes('park') ||
              description.includes('park') ||
              description.includes('trail')
            );
          });
      }

      setSearchResults(placesArray);
      setShowResults(true);
    } catch (error) {
      console.error('[Explore] Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const clearResults = () => {
    setQuery('');
    setSearchResults([]);
    setShowResults(false);
    setTypeaheadResults([]);
  };

  const handleUseLocation = () => {
    loadNearbyTrails();
  };

  const handleCategorySelect = (categoryQuery: string) => {
    if (categoryQuery === 'nearby' && userLocation) {
      // Already loaded nearby trails
      return;
    }
    setQuery(categoryQuery);
    handleSearch(categoryQuery);
  };

  const handleTypeaheadSelect = (place: any) => {
    // Already normalized, but double-check
    const placeId = place.id || place.place_id || place.google_place_id;
    if (placeId && placeId !== 'undefined' && placeId !== 'null') {
      router.push(`/places/${placeId}`);
    } else {
      console.error('[Explore] Invalid place ID on typeahead select:', place);
    }
  };

  // Prepare data for ExploreContinue - use real active hike data from API only
  // Don't show fake "active-1" if no real data
  const activeHike = realActiveHike || null;

  const recentlyViewed: any[] = [];
  
  const recentlyCompleted = userStats?.recent_activity
    ?.filter(activity => activity.status === 'completed')
    ?.slice(0, 2)
    ?.map(activity => ({
      id: activity.id,
      trailName: activity.trail_name,
      parkName: activity.place_name,
      date: activity.date || undefined,
      distance: activity.distance_miles || undefined,
    })) || [];

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-emerald-50/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* 1. Compact Identity Header - ALWAYS VISIBLE */}
        <ExploreHeaderIdentity
          userName={user.name}
          explorerLevel={userStats?.explorer_level || 'Adventurer'}
          nextMilestone={userStats?.next_milestone || 'Complete your first trail'}
          currentPoints={userStats?.current_points || 0}
          milestonePoints={userStats?.next_milestone_points || 100}
        />

        {/* 2. Prominent Search */}
        <ExploreSearch
          query={query}
          onQueryChange={setQuery}
          onSearch={handleSearch}
          onClear={clearResults}
          onLocationRequest={handleUseLocation}
          isLoading={searching}
          requestingLocation={requestingLocation}
          locationError={locationError}
          typeaheadResults={typeaheadResults}
          onTypeaheadSelect={handleTypeaheadSelect}
        />

        {/* 3. Quick Explore Categories (only when no search results) */}
        {!showResults && (
          <ExploreQuickExplore
            onCategorySelect={handleCategorySelect}
            hasNearbyParks={nearbyPlaces.length > 0}
          />
        )}

        {/* 4. Search Results (when active) */}
        {showResults && (
          <ExploreSearchResults results={searchResults} onClear={clearResults} />
        )}

        {/* 5. Nearby Trails (MAIN CONTENT - when no search) */}
        {!showResults && (
          <ExploreNearbyTrails trails={nearbyTrails} isLoading={loadingTrails} />
        )}

        {/* 6. Context Strip */}
        {!showResults && (
          <ExploreContextStrip
            weather={weatherData}
            alertsCount={0}
            nearbyCount={nearbyTrails.length}
            radiusMiles={31}
          />
        )}

        {/* 7. Continue Exploring */}
        {!showResults && (activeHike || recentlyCompleted.length > 0) && (
          <ExploreContinue
            activeHike={activeHike}
            recentlyViewed={recentlyViewed}
            recentlyCompleted={recentlyCompleted}
          />
        )}
      </div>
    </div>
  );
}

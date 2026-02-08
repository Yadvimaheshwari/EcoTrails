'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { getHikes, getUserAchievements, getJournalEntries, getFavorites, getPlaceWeather } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { BackgroundSystem } from '@/components/BackgroundSystem';
import type { Hike, JournalEntry, Place, Trail } from '@/types';
import { 
  validateResponse, 
  HikesResponseSchema, 
  JournalEntriesResponseSchema 
} from '@/lib/validation';

interface PlannedHike {
  id: string;
  place_id: string;
  place?: Place;
  planned_visit_date: string;
  journal_entry?: JournalEntry;
  weather?: any;
  map_downloaded?: boolean;
}

interface FilterState {
  search: string;
  park: string;
  difficulty: string;
  dateFrom: string;
  dateTo: string;
}

export function JournalHomeV2() {
  const { user, isLoading } = useAuth();
  const [upcomingHikes, setUpcomingHikes] = useState<PlannedHike[]>([]);
  const [completedHikes, setCompletedHikes] = useState<Hike[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    park: 'all',
    difficulty: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const [completedHikesRes, achievementsRes, journalRes, favoritesRes] = await Promise.all([
        getHikes('completed'),
        getUserAchievements(),
        getJournalEntries(undefined, undefined, 100),
        getFavorites(),
      ]);

      // Validate responses
      const completedHikesValidation = validateResponse(
        HikesResponseSchema,
        completedHikesRes.data,
        'Completed hikes response'
      );

      const journalValidation = validateResponse(
        JournalEntriesResponseSchema,
        journalRes.data,
        'Journal entries response'
      );

      if (!completedHikesValidation.success) {
        console.error('Validation failed for completed hikes:', completedHikesValidation.error);
        // Continue with empty array instead of returning
        setCompletedHikes([]);
      } else {
        setCompletedHikes(completedHikesValidation.data.hikes || []);
      }

      if (!journalValidation.success) {
        console.error('Validation failed for journal entries:', journalValidation.error);
        // Continue with empty array
      }

      setAchievements(achievementsRes.data?.achievements || []);

      // Build upcoming hikes from favorites with planned dates
      const favorites = favoritesRes.data?.favorites || [];
      const tripPlans = journalValidation.success 
        ? journalValidation.data.entries.filter((e: JournalEntry) => e.entry_type === 'trip_plan')
        : [];
      
      const upcoming: PlannedHike[] = [];
      
      for (const favorite of favorites) {
        if (favorite.planned_visit_date) {
          const visitDate = new Date(favorite.planned_visit_date);
          if (isAfter(visitDate, startOfDay(new Date()))) {
            const plan = tripPlans.find((p: JournalEntry) => (p.meta_data as any)?.place_id === favorite.place_id);
            
            // Try to get weather (with error handling)
            let weather = null;
            if (favorite.place_id) {
              try {
                const weatherRes = await getPlaceWeather(favorite.place_id);
                weather = weatherRes.data;
              } catch (error) {
                console.error('Failed to load weather:', error);
              }
            }

            upcoming.push({
              id: favorite.id,
              place_id: favorite.place_id,
              place: favorite.place,
              planned_visit_date: favorite.planned_visit_date,
              journal_entry: plan,
              weather,
              map_downloaded: false, // TODO: Check actual download status
            });
          }
        }
      }

      setUpcomingHikes(upcoming.sort((a, b) => 
        new Date(a.planned_visit_date).getTime() - new Date(b.planned_visit_date).getTime()
      ));
    } catch (error) {
      console.error('Failed to load journal data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && user) {
      loadData();
    }
  }, [isLoading, user, loadData]);

  // Filter completed hikes
  const filteredCompletedHikes = useMemo(() => {
    let filtered = [...completedHikes];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(hike => 
        hike.trail?.name?.toLowerCase().includes(searchLower) ||
        hike.trail?.place?.name?.toLowerCase().includes(searchLower) ||
        (hike.meta_data as any)?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Park filter
    if (filters.park !== 'all') {
      filtered = filtered.filter(hike => 
        hike.trail?.place?.id === filters.park
      );
    }

    // Difficulty filter
    if (filters.difficulty !== 'all') {
      filtered = filtered.filter(hike => 
        hike.trail?.difficulty === filters.difficulty
      );
    }

    // Date filters
    if (filters.dateFrom) {
      const fromDate = startOfDay(parseISO(filters.dateFrom));
      filtered = filtered.filter(hike => 
        hike.start_time && isAfter(parseISO(hike.start_time), fromDate)
      );
    }

    if (filters.dateTo) {
      const toDate = startOfDay(parseISO(filters.dateTo));
      filtered = filtered.filter(hike => 
        hike.start_time && isBefore(parseISO(hike.start_time), toDate)
      );
    }

    return filtered;
  }, [completedHikes, filters]);

  // Get unique parks and difficulties for filters
  const uniqueParks = useMemo(() => {
    const parks = new Map<string, Place>();
    completedHikes.forEach(hike => {
      if (hike.trail?.place) {
        parks.set(hike.trail.place.id, hike.trail.place);
      }
    });
    return Array.from(parks.values());
  }, [completedHikes]);

  const uniqueDifficulties = useMemo(() => {
    const difficulties = new Set<string>();
    completedHikes.forEach(hike => {
      if (hike.trail?.difficulty) {
        difficulties.add(hike.trail.difficulty);
      }
    });
    return Array.from(difficulties);
  }, [completedHikes]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F6F8F7' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#0F3D2E' }}></div>
          <p className="text-textSecondary">Loading journal...</p>
        </div>
      </div>
    );
  }

  return (
    <BackgroundSystem context="journal" userPhotos={[]}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-light mb-2 text-text">Journal</h1>
          <p className="text-textSecondary">Your hiking adventures and plans</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search hikes..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="flex-1 px-4 py-2 rounded-xl border border-E8E8E3 text-text"
              style={{ backgroundColor: '#FAFAF8' }}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={filters.park}
              onChange={(e) => setFilters(prev => ({ ...prev, park: e.target.value }))}
              className="px-4 py-2 rounded-xl border border-E8E8E3 text-text"
              style={{ backgroundColor: '#FAFAF8' }}
            >
              <option value="all">All Parks</option>
              {uniqueParks.map(park => (
                <option key={park.id} value={park.id}>{park.name}</option>
              ))}
            </select>

            <select
              value={filters.difficulty}
              onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
              className="px-4 py-2 rounded-xl border border-E8E8E3 text-text"
              style={{ backgroundColor: '#FAFAF8' }}
            >
              <option value="all">All Difficulties</option>
              {uniqueDifficulties.map(diff => (
                <option key={diff} value={diff}>{diff.charAt(0).toUpperCase() + diff.slice(1)}</option>
              ))}
            </select>

            <input
              type="date"
              placeholder="From date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="px-4 py-2 rounded-xl border border-E8E8E3 text-text"
              style={{ backgroundColor: '#FAFAF8' }}
            />

            <input
              type="date"
              placeholder="To date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="px-4 py-2 rounded-xl border border-E8E8E3 text-text"
              style={{ backgroundColor: '#FAFAF8' }}
            />

            {(filters.search || filters.park !== 'all' || filters.difficulty !== 'all' || filters.dateFrom || filters.dateTo) && (
              <button
                onClick={() => setFilters({ search: '', park: 'all', difficulty: 'all', dateFrom: '', dateTo: '' })}
                className="px-4 py-2 rounded-xl text-sm"
                style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3', color: '#5F6F6A' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Upcoming Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-light text-text">Upcoming</h2>
            <span className="text-textSecondary">{upcomingHikes.length} planned</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-textSecondary">Loading upcoming hikes...</div>
          ) : upcomingHikes.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No upcoming hikes"
              message="Plan a hike by favoriting a place and setting a visit date"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingHikes.map((planned) => {
                const planData = planned.journal_entry?.meta_data as any;
                const checklist = planData?.trip_plan_data?.plan?.checklist || {};
                const checklistItems = Object.values(checklist).flat() as string[];
                const completedItems = checklistItems.filter((item: string) => 
                  planData?.completed_checklist_items?.includes(item)
                ).length;

                return (
                  <div
                    key={planned.id}
                    className="p-6 rounded-2xl"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}
                  >
                    <div className="mb-4">
                      <h3 className="text-xl font-medium text-text mb-2">
                        {planned.place?.name || 'Planned Hike'}
                      </h3>
                      <p className="text-sm text-textSecondary">
                        {format(parseISO(planned.planned_visit_date), 'MMM d, yyyy')}
                      </p>
                    </div>

                    {/* Checklist */}
                    {checklistItems.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-text">Checklist</span>
                          <span className="text-xs text-textSecondary">
                            {completedItems}/{checklistItems.length}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {checklistItems.slice(0, 3).map((item: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={planData?.completed_checklist_items?.includes(item) || false}
                                readOnly
                                className="rounded"
                              />
                              <span className="text-textSecondary">{item}</span>
                            </div>
                          ))}
                          {checklistItems.length > 3 && (
                            <p className="text-xs text-textSecondary">
                              +{checklistItems.length - 3} more items
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Weather Window */}
                    {planned.weather && (
                      <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: '#E8F4F8', border: '1px solid #4C7EF340' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🌤️</span>
                          <span className="text-sm font-medium text-text">Weather</span>
                        </div>
                        {planned.weather.forecast ? (
                          <p className="text-xs text-textSecondary">
                            {planned.weather.forecast.summary || 'Weather available'}
                          </p>
                        ) : (
                          <p className="text-xs text-textSecondary">Loading weather...</p>
                        )}
                      </div>
                    )}

                    {/* Map Download Status */}
                    <div className="mb-4 flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🗺️</span>
                        <span className="text-sm text-text">Offline Map</span>
                      </div>
                      <span className={`text-xs ${planned.map_downloaded ? 'text-green-600' : 'text-textSecondary'}`}>
                        {planned.map_downloaded ? 'Downloaded' : 'Not downloaded'}
                      </span>
                    </div>

                    {/* Prep Notes */}
                    {planData?.prep_notes && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-text mb-1">Prep Notes</p>
                        <p className="text-xs text-textSecondary line-clamp-2">
                          {planData.prep_notes}
                        </p>
                      </div>
                    )}

                    <Link
                      href={`/places/${planned.place_id}`}
                      className="block text-center px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
                      style={{ backgroundColor: '#4F8A6B' }}
                    >
                      View Details
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-light text-text">Past</h2>
            <span className="text-textSecondary">{filteredCompletedHikes.length} hikes</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-textSecondary">Loading completed hikes...</div>
          ) : filteredCompletedHikes.length === 0 ? (
            <EmptyState
              icon="🏔️"
              title="No completed hikes"
              message={completedHikes.length === 0 
                ? "Complete a hike to see it here"
                : "No hikes match your filters"}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompletedHikes.map((hike) => {
                const hikeAchievements = achievements.filter(a => a.hike_id === hike.id);
                const mediaCount = hike.media?.length || 0;
                const hasAISummary = (hike.meta_data as any)?.ai_summary !== undefined;

                return (
                  <div
                    key={hike.id}
                    className="p-6 rounded-2xl"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3' }}
                  >
                    <div className="mb-4">
                      <h3 className="text-xl font-medium text-text mb-2">
                        {hike.trail?.name || 'Completed Hike'}
                      </h3>
                      <p className="text-sm text-textSecondary mb-2">
                        {hike.trail?.place?.name || ''}
                      </p>
                      <p className="text-xs text-textSecondary">
                        {format(parseISO(hike.start_time), 'MMM d, yyyy')}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {hike.distance_miles && (
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#FAFAF8' }}>
                          <div className="text-lg font-medium text-text">{hike.distance_miles.toFixed(1)}</div>
                          <div className="text-xs text-textSecondary">mi</div>
                        </div>
                      )}
                      {hike.elevation_gain_feet && (
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#FAFAF8' }}>
                          <div className="text-lg font-medium text-text">+{Math.round(hike.elevation_gain_feet)}</div>
                          <div className="text-xs text-textSecondary">ft</div>
                        </div>
                      )}
                      {hike.duration_minutes && (
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#FAFAF8' }}>
                          <div className="text-lg font-medium text-text">
                            {Math.floor(hike.duration_minutes / 60)}h {hike.duration_minutes % 60}m
                          </div>
                          <div className="text-xs text-textSecondary">time</div>
                        </div>
                      )}
                    </div>

                    {/* Achievements */}
                    {hikeAchievements.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-text mb-2">Achievements</p>
                        <div className="flex flex-wrap gap-1">
                          {hikeAchievements.slice(0, 3).map(achievement => (
                            <span
                              key={achievement.id}
                              className="px-2 py-1 rounded text-xs"
                              style={{ backgroundColor: '#FFF8F0', border: '1px solid #F4A34040', color: '#F4A340' }}
                            >
                              🏆 {achievement.achievement?.name || achievement.name}
                            </span>
                          ))}
                          {hikeAchievements.length > 3 && (
                            <span className="px-2 py-1 rounded text-xs text-textSecondary">
                              +{hikeAchievements.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Media Count */}
                    <div className="mb-4 flex items-center gap-2 text-sm text-textSecondary">
                      <span>📸</span>
                      <span>{mediaCount} {mediaCount === 1 ? 'photo' : 'photos'}</span>
                    </div>

                    {/* AI Summary Button */}
                    <div className="flex gap-2">
                      <button
                        disabled={!hasAISummary}
                        className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                          hasAISummary
                            ? 'text-white hover:opacity-90'
                            : 'text-textSecondary cursor-not-allowed opacity-50'
                        }`}
                        style={{ 
                          backgroundColor: hasAISummary ? '#4F8A6B' : '#FAFAF8',
                          border: hasAISummary ? 'none' : '1px solid #E8E8E3'
                        }}
                        onClick={() => {
                          if (hasAISummary) {
                            // TODO: Navigate to AI summary view when detail page is ready
                            console.log('View AI summary for hike:', hike.id);
                          }
                        }}
                      >
                        {hasAISummary ? 'View AI Summary' : 'AI Summary (Not Available)'}
                      </button>
                      <Link
                        href={`/journal/${hike.id}`}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-text transition-colors hover:opacity-90"
                        style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3' }}
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BackgroundSystem>
  );
}

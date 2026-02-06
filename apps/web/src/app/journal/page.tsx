'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { JournalShell } from '@/components/journal/JournalShell';
import { JournalModeSwitch } from '@/components/journal/JournalModeSwitch';
import { ActiveHikeBanner } from '@/components/journal/ActiveHikeBanner';
import { useAuth } from '@/contexts/AuthContext';
import { getJournalEntries, getHikes, getUserAchievements } from '@/lib/api';
import { 
  mockTripPlans, 
  mockCompletedHikes, 
  mockDiscoveries, 
  mockAchievements,
  mockUserStats,
  getLatestActiveHike,
  calculateChecklistProgress 
} from '@/lib/journal/mockData';
import type { TripPlan, Hike, Discovery, Achievement, UserStats } from '@/lib/journal/types';

type JournalMode = 'plan' | 'log' | 'discoveries' | 'achievements';

export default function JournalPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [mode, setMode] = useState<JournalMode>('plan');
  const [isLoading, setIsLoading] = useState(true);

  // Real data state – starts empty, falls back to mock only when API fails
  const [tripPlans, setTripPlans] = useState<TripPlan[]>([]);
  const [completedHikes, setCompletedHikes] = useState<Hike[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<UserStats>(mockUserStats);

  const activeHike = getLatestActiveHike();

  // Fetch user-scoped data from API
  const fetchUserData = useCallback(async () => {
    if (!user || !token) {
      // No authenticated user – clear data
      setTripPlans([]);
      setCompletedHikes([]);
      setDiscoveries([]);
      setAchievements([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch trip plans (journal entries with type "trip_plan"), completed hikes, and achievements in parallel
      const [journalRes, hikesRes, achievementsRes] = await Promise.allSettled([
        getJournalEntries(undefined, 'trip_plan', 50),
        getHikes('completed', 50),
        getUserAchievements(undefined, 100),
      ]);

      // Parse trip plans from journal entries
      if (journalRes.status === 'fulfilled' && journalRes.value?.data?.entries) {
        const entries = journalRes.value.data.entries;
        const plans: TripPlan[] = entries.map((entry: any) => {
          const meta = entry.metadata || {};
          const planData = meta.trip_plan_data?.plan || {};
          return {
            id: entry.id,
            name: entry.title || meta.place_name || 'Trip Plan',
            parkName: meta.place_name || '',
            parkId: meta.place_id || '',
            startDate: meta.visit_date || entry.created_at,
            endDate: meta.visit_date || entry.created_at,
            plannedTrails: [],
            checklist: Object.entries(planData.checklist || {}).flatMap(
              ([category, items]: [string, any]) =>
                (items as string[]).map((item: string, idx: number) => ({
                  id: `${category}-${idx}`,
                  category: category as any,
                  item,
                  completed: false,
                  required: true,
                }))
            ),
            logistics: { transportation: 'not_set' as const },
            permits: { status: 'not_started' as const, required: false },
            offlineStatus: 'not_downloaded' as const,
            notes: entry.content,
            createdAt: entry.created_at,
            updatedAt: entry.updated_at || entry.created_at,
          };
        });
        setTripPlans(plans);
      } else {
        setTripPlans([]);
      }

      // Parse completed hikes – transform API shape to journal Hike shape
      if (hikesRes.status === 'fulfilled' && hikesRes.value?.data?.hikes) {
        const apiHikes = hikesRes.value.data.hikes as any[];
        const mapped: Hike[] = apiHikes.map((h) => ({
          id: h.id,
          trailName: h.trail?.name || h.meta_data?.trail_name || 'Unnamed Trail',
          parkName: h.trail?.place?.name || h.meta_data?.place_name || '',
          parkId: h.place_id || h.trail?.place_id || undefined,
          trailId: h.trail_id || undefined,
          status: h.status as Hike['status'],
          startTime: h.start_time,
          endTime: h.end_time || undefined,
          stats: {
            distance: h.distance_miles || 0,
            duration: h.duration_minutes || 0,
            elevationGain: h.elevation_gain_feet || 0,
            elevationLoss: 0,
            maxAltitude: h.max_altitude_feet || 0,
          },
          discoveries: [],
          media: [],
        }));
        setCompletedHikes(mapped);
      } else {
        setCompletedHikes([]);
      }

      // Parse achievements
      if (achievementsRes.status === 'fulfilled' && achievementsRes.value?.data) {
        const achData = achievementsRes.value.data;
        const achList = Array.isArray(achData) ? achData : achData.achievements || [];
        setAchievements(achList);
      } else {
        setAchievements([]);
      }
    } catch (error) {
      console.error('Failed to fetch journal data:', error);
      // On total failure, clear data rather than show another user's data
      setTripPlans([]);
      setCompletedHikes([]);
      setAchievements([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  // Re-fetch when user changes (login / logout / switch account)
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Get next upcoming trip
  const nextTrip = tripPlans[0];

  const handleEndHike = () => {
    if (confirm('Are you sure you want to end this hike?')) {
      router.push(`/hikes/${activeHike?.hikeId}?action=end`);
    }
  };

  return (
    <JournalShell title="Journal">
      {/* Active Hike Banner */}
      {activeHike && (
        <ActiveHikeBanner hike={activeHike} onEndHike={handleEndHike} />
      )}

      {/* Next Up Hero */}
      {nextTrip && !activeHike && (
        <div className="mb-8 p-6 rounded-3xl" 
             style={{ backgroundColor: '#FFFFFF', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h2 className="text-sm font-medium text-gray-500 mb-3">NEXT UP</h2>
          <h3 className="text-2xl font-light mb-2" style={{ color: '#1B1F1E' }}>
            {nextTrip.name}
          </h3>
          <p className="text-gray-600 mb-4">
            {nextTrip.parkName} • {new Date(nextTrip.startDate).toLocaleDateString()} - {new Date(nextTrip.endDate).toLocaleDateString()}
          </p>
          
          {/* Status Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-xs text-gray-500 mb-1">Checklist</div>
              <div className="font-medium">{calculateChecklistProgress(nextTrip.checklist).completed}/{calculateChecklistProgress(nextTrip.checklist).total}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Permits</div>
              <span className="px-2 py-1 rounded-full text-xs font-medium capitalize" 
                    style={{ 
                      backgroundColor: nextTrip.permits.status === 'obtained' ? '#4F8A6B20' : '#F4A34020',
                      color: nextTrip.permits.status === 'obtained' ? '#4F8A6B' : '#F4A340'
                    }}>
                {nextTrip.permits.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Maps</div>
              <span className="px-2 py-1 rounded-full text-xs font-medium capitalize"
                    style={{
                      backgroundColor: nextTrip.offlineStatus === 'ready' ? '#4F8A6B20' : '#E8E8E3',
                      color: nextTrip.offlineStatus === 'ready' ? '#4F8A6B' : '#6B7280'
                    }}>
                {nextTrip.offlineStatus === 'ready' ? 'Ready' : 'Not downloaded'}
              </span>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Weather</div>
              <div className="text-sm">{nextTrip.weather?.conditions || 'Loading...'}</div>
            </div>
          </div>

          <button
            onClick={() => router.push(`/journal/plans/${nextTrip.id}`)}
            className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.02]"
            style={{ backgroundColor: '#4F8A6B' }}>
            Open Trip Plan
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Parks Explored', value: stats.parksExplored, icon: '🏞️' },
          { label: 'Trails Completed', value: stats.trailsCompleted, icon: '🥾' },
          { label: 'Elevation Gained', value: `${stats.totalElevationGained}ft`, icon: '📈' },
          { label: 'Discoveries', value: stats.discoveriesLogged, icon: '🔍' },
          { label: 'Explorer Level', value: stats.explorerLevel, icon: '⭐' },
        ].map((stat, idx) => (
          <div key={idx} className="p-4 rounded-2xl" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-light mb-1">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Mode Switch */}
      <div className="mb-6">
        <JournalModeSwitch currentMode={mode} onChange={setMode} />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center mb-3 mx-auto animate-pulse">
              <span className="text-2xl">📖</span>
            </div>
            <p className="text-sm text-gray-500">Loading your journal...</p>
          </div>
        </div>
      )}

      {/* Content by Mode */}
      {!isLoading && (
        <div className="min-h-[400px]">
          {mode === 'plan' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Trip Plans</h3>
                <button className="px-4 py-2 rounded-xl font-medium text-white transition-all hover:scale-105"
                        style={{ backgroundColor: '#4F8A6B' }}>
                  + New Trip
                </button>
              </div>
              {tripPlans.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <h4 className="text-xl font-light mb-2">No trips planned yet</h4>
                  <p className="text-gray-600 mb-6">Start planning your next adventure</p>
                  <button className="px-6 py-3 rounded-xl font-medium text-white"
                          style={{ backgroundColor: '#4F8A6B' }}>
                    Plan Your First Trip
                  </button>
                </div>
              ) : (
                tripPlans.map((plan) => (
                  <div key={plan.id} className="p-6 rounded-2xl cursor-pointer hover:scale-[1.01] transition-all"
                       style={{ backgroundColor: '#FFFFFF' }}
                       onClick={() => router.push(`/journal/plans/${plan.id}`)}>
                    <h4 className="text-xl font-light mb-2">{plan.name}</h4>
                    <p className="text-gray-600 mb-4">{plan.parkName}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>📅 {new Date(plan.startDate).toLocaleDateString()}</span>
                      <span>🥾 {plan.plannedTrails.length} trails</span>
                      <span>✅ {calculateChecklistProgress(plan.checklist).completed}/{calculateChecklistProgress(plan.checklist).total}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {mode === 'log' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium mb-4">Completed Hikes</h3>
              {completedHikes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🥾</div>
                  <h4 className="text-xl font-light mb-2">No hikes yet</h4>
                  <p className="text-gray-600 mb-6">Start your first hike to build your log</p>
                  <button className="px-6 py-3 rounded-xl font-medium text-white"
                          style={{ backgroundColor: '#4F8A6B' }}
                          onClick={() => router.push('/explore')}>
                    Explore Trails
                  </button>
                </div>
              ) : (
                completedHikes.map((hike) => (
                  <div key={hike.id} className="p-6 rounded-2xl cursor-pointer hover:scale-[1.01] transition-all"
                       style={{ backgroundColor: '#FFFFFF' }}
                       onClick={() => router.push(`/journal/hikes/${hike.id}`)}>
                    <h4 className="text-xl font-light mb-2">{hike.trailName}</h4>
                    <p className="text-gray-600 mb-4">{hike.parkName} • {new Date(hike.startTime).toLocaleDateString()}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>📏 {hike.stats.distance} mi</span>
                      <span>📈 {hike.stats.elevationGain} ft</span>
                      <span>⏱️ {Math.floor(hike.stats.duration / 60)}h {hike.stats.duration % 60}m</span>
                      <span>🔍 {hike.discoveries.length} discoveries</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {mode === 'discoveries' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Discovery Archive</h3>
                <select className="px-4 py-2 rounded-xl border border-gray-200">
                  <option value="all">All Categories</option>
                  <option value="wildlife">Wildlife</option>
                  <option value="vegetation">Vegetation</option>
                  <option value="geology">Geology</option>
                  <option value="history">History</option>
                </select>
              </div>
              {discoveries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <h4 className="text-xl font-light mb-2">No discoveries yet</h4>
                  <p className="text-gray-600">Log discoveries on your next hike</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {discoveries.map((discovery) => (
                    <div key={discovery.id} className="p-4 rounded-2xl" style={{ backgroundColor: '#FFFFFF' }}>
                      <span className="px-2 py-1 rounded-full text-xs font-medium capitalize mb-2 inline-block"
                            style={{ backgroundColor: '#4F8A6B20', color: '#4F8A6B' }}>
                        {discovery.category}
                      </span>
                      <h4 className="text-lg font-medium mb-2">{discovery.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{discovery.description}</p>
                      <div className="text-xs text-gray-500">
                        {discovery.parkName} • {new Date(discovery.timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Confidence: {discovery.confidence}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === 'achievements' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium mb-4">Achievements</h3>
              
              {/* Next Milestone */}
              <div className="p-6 rounded-2xl mb-6" style={{ backgroundColor: '#FFF8F0', border: '2px solid #F4A340' }}>
                <h4 className="text-sm font-medium text-gray-500 mb-2">NEXT MILESTONE</h4>
                <h5 className="text-xl font-light mb-2">{stats.nextMilestone.name}</h5>
                <div className="w-full h-2 rounded-full mb-2" style={{ backgroundColor: '#E8E8E3' }}>
                  <div className="h-full rounded-full transition-all" 
                       style={{ backgroundColor: '#F4A340', width: `${stats.nextMilestone.progress}%` }} />
                </div>
                <p className="text-sm text-gray-600">{stats.nextMilestone.description}</p>
              </div>

              {/* Achievement List */}
              {achievements.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏅</div>
                  <h4 className="text-xl font-light mb-2">No achievements yet</h4>
                  <p className="text-gray-600">Complete hikes to earn badges and achievements</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} 
                         className="p-6 rounded-2xl"
                         style={{ 
                           backgroundColor: '#FFFFFF',
                           opacity: achievement.status === 'locked' ? 0.6 : 1
                         }}>
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <h4 className="text-lg font-medium mb-1">{achievement.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                          {achievement.status === 'unlocked' && achievement.unlockedAt && (
                            <div className="text-xs text-gray-500">
                              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                            </div>
                          )}
                          {achievement.progress && (
                            <div className="mt-2">
                              <div className="w-full h-1.5 rounded-full mb-1" style={{ backgroundColor: '#E8E8E3' }}>
                                <div className="h-full rounded-full" 
                                     style={{ 
                                       backgroundColor: '#4F8A6B',
                                       width: `${(achievement.progress.current / achievement.progress.target) * 100}%`
                                     }} />
                              </div>
                              <div className="text-xs text-gray-500">
                                {achievement.progress.current} / {achievement.progress.target} {achievement.progress.unit}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </JournalShell>
  );
}

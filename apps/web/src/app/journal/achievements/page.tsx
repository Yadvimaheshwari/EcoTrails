'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { setAuthToken, getUserAchievements, getParkBadges } from '@/lib/api';
import { ChevronLeft, Lock, CheckCircle, TrendingUp } from 'lucide-react';

interface ParkBadge {
  id: string;
  achievement: {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    category: string;
  };
  unlocked_at: string | null;
  hike_id: string | null;
  badge_image: string | null;
  badge_caption: string | null;
  park_url: string | null;
  park_designation: string | null;
  park_states: string | null;
  all_images: Array<{ url: string; caption: string; title: string }>;
}

interface LockedPark {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  locked: boolean;
}

interface Achievement {
  id: string;
  achievement: {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    category: string;
  };
  unlocked_at: string | null;
  hike_id: string | null;
}

export default function AchievementsPage() {
  const router = useRouter();
  const { user, isLoading, token } = useAuth();
  const [parkBadges, setParkBadges] = useState<ParkBadge[]>([]);
  const [lockedParks, setLockedParks] = useState<LockedPark[]>([]);
  const [otherAchievements, setOtherAchievements] = useState<Achievement[]>([]);
  const [parkStats, setParkStats] = useState({ national_parks: 0, state_parks: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'badges' | 'all'>('badges');
  const [selectedBadge, setSelectedBadge] = useState<ParkBadge | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && token) {
      setAuthToken(token);
      loadData();
    }
  }, [user, isLoading, token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [badgesRes, achievementsRes] = await Promise.all([
        getParkBadges().catch(() => null),
        getUserAchievements().catch(() => null),
      ]);

      if (badgesRes?.data) {
        setParkBadges(badgesRes.data.unlocked || []);
        setLockedParks(badgesRes.data.locked || []);
        setParkStats(badgesRes.data.stats || { national_parks: 0, state_parks: 0 });
      }

      if (achievementsRes?.data?.achievements) {
        // Filter out park achievements (they're shown in the badges tab)
        const nonParkAchievements = achievementsRes.data.achievements.filter(
          (a: Achievement) => !['national_park', 'state_park', 'park_explorer'].includes(a.achievement?.category)
        );
        setOtherAchievements(nonParkAchievements);
      }
    } catch (err) {
      console.error('Failed to load achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalBadges = parkBadges.length;

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F6F8F7' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#0F3D2E' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => router.push('/journal')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Back to journal"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">Achievements & Badges</h1>
              <p className="text-sm text-slate-600 mt-1">
                {totalBadges} park badge{totalBadges !== 1 ? 's' : ''} earned
                {otherAchievements.length > 0 && ` · ${otherAchievements.length} achievement${otherAchievements.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('badges')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'badges'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🏅 Park Badges
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🏆 All Achievements
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4" style={{ borderColor: '#D97706' }}></div>
              <p className="text-slate-600">Loading achievements...</p>
            </div>
          </div>
        ) : activeTab === 'badges' ? (
          <>
            {/* Park Stats Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg">
              <h2 className="text-xl font-bold mb-4">🗺️ Your Park Collection</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-black">{totalBadges}</div>
                  <div className="text-emerald-100 text-sm">Total Parks</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black">{parkStats.national_parks}</div>
                  <div className="text-emerald-100 text-sm">National Parks</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black">{parkStats.state_parks}</div>
                  <div className="text-emerald-100 text-sm">State Parks</div>
                </div>
              </div>
            </div>

            {/* Unlocked Badges Grid */}
            {parkBadges.length > 0 ? (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">✅ Earned Badges</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {parkBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-white rounded-2xl p-4 border-2 border-emerald-200 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-400 transition-all"
                      onClick={() => setSelectedBadge(badge)}
                    >
                      {/* Badge Image */}
                      <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-emerald-50 flex items-center justify-center">
                        {badge.badge_image ? (
                          <img
                            src={badge.badge_image}
                            alt={badge.achievement.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-5xl">🏞️</span>';
                            }}
                          />
                        ) : (
                          <span className="text-5xl">
                            {badge.achievement.category === 'national_park' ? '🏔️' : '🌲'}
                          </span>
                        )}
                      </div>

                      {/* Badge Info */}
                      <div className="text-center">
                        <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">
                          {badge.achievement.name}
                        </h4>
                        {badge.park_designation && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            {badge.park_designation}
                          </span>
                        )}
                        {badge.unlocked_at && (
                          <p className="text-xs text-slate-500 mt-2">
                            {new Date(badge.unlocked_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <div className="text-5xl mb-4">🏅</div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">No park badges yet</h2>
                <p className="text-slate-600 mb-6">
                  Complete a hike at any national or state park to earn your first badge!
                </p>
                <button
                  onClick={() => router.push('/explore')}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Find a park to explore
                </button>
              </div>
            )}

            {/* Locked Badges */}
            {lockedParks.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">🔒 Parks to Discover</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {lockedParks.map((park) => (
                    <div
                      key={park.id}
                      className="bg-white/60 rounded-xl p-3 border border-slate-200 opacity-60"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 grayscale">
                          <Lock className="w-5 h-5 text-slate-400" />
                        </div>
                        <h4 className="text-xs font-medium text-slate-500 leading-tight">
                          {park.name}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* All Achievements Tab */
          <>
            {otherAchievements.length > 0 ? (
              <div className="space-y-3">
                {otherAchievements.map((ach) => (
                  <div
                    key={ach.id}
                    className="bg-white rounded-xl p-4 border-2 border-emerald-200 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center text-3xl flex-shrink-0">
                        {ach.achievement.icon || '🏆'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="text-lg font-bold text-slate-800">
                            {ach.achievement.name}
                          </h3>
                          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          {ach.achievement.description}
                        </p>
                        {ach.unlocked_at && (
                          <div className="flex items-center gap-3 text-xs text-emerald-700">
                            <span className="font-medium">
                              Unlocked{' '}
                              {new Date(ach.unlocked_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {ach.hike_id && (
                              <>
                                <span>•</span>
                                <button
                                  onClick={() => router.push(`/journal/hikes/${ach.hike_id}`)}
                                  className="hover:underline"
                                >
                                  View hike
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">No achievements yet</h2>
                <p className="text-slate-600 mb-6">
                  Start hiking to unlock achievements and track your progress!
                </p>
                <button
                  onClick={() => router.push('/explore')}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                >
                  Explore trails
                </button>
              </div>
            )}
          </>
        )}

        {/* Motivational Footer */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-800 mb-2">Keep Exploring!</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Every national and state park you visit earns you an official badge. 
            Challenge yourself to collect them all — each park has its own unique story waiting for you.
          </p>
        </div>
      </main>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Badge Image */}
            {selectedBadge.badge_image ? (
              <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-slate-100">
                <img
                  src={selectedBadge.badge_image}
                  alt={selectedBadge.achievement.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                <span className="text-7xl">
                  {selectedBadge.achievement.category === 'national_park' ? '🏔️' : '🌲'}
                </span>
              </div>
            )}

            <h2 className="text-2xl font-black text-slate-800 mb-2">
              {selectedBadge.achievement.name}
            </h2>

            {selectedBadge.park_designation && (
              <span className="inline-block text-sm px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 mb-3">
                {selectedBadge.park_designation}
              </span>
            )}

            <p className="text-slate-600 mb-4">
              {selectedBadge.achievement.description}
            </p>

            {selectedBadge.badge_caption && (
              <p className="text-sm text-slate-500 italic mb-4">
                "{selectedBadge.badge_caption}"
              </p>
            )}

            {selectedBadge.park_states && (
              <div className="text-sm text-slate-600 mb-3">
                📍 {selectedBadge.park_states}
              </div>
            )}

            {selectedBadge.unlocked_at && (
              <div className="text-sm text-emerald-700 font-medium mb-4">
                ✅ Earned on{' '}
                {new Date(selectedBadge.unlocked_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            )}

            {/* Additional Images */}
            {selectedBadge.all_images && selectedBadge.all_images.length > 1 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Gallery</h4>
                <div className="grid grid-cols-3 gap-2">
                  {selectedBadge.all_images.slice(0, 3).map((img, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                      <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {selectedBadge.park_url && (
                <a
                  href={selectedBadge.park_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 rounded-lg text-center text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  🌐 Visit NPS Page
                </a>
              )}
              {selectedBadge.hike_id && (
                <button
                  onClick={() => {
                    setSelectedBadge(null);
                    router.push(`/journal/hikes/${selectedBadge.hike_id}`);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg text-center text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  🥾 View Hike
                </button>
              )}
            </div>

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full mt-3 px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

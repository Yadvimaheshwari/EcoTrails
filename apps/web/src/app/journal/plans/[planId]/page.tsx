'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getJournalEntries, updateJournalEntry } from '@/lib/api';
import { TripPlan, ChecklistItem } from '@/lib/journal/types';
import { 
  Calendar, MapPin, CheckCircle2, Circle, Clock, Info, 
  ChevronLeft, Download, Mountain, AlertCircle, ThermometerSun,
  Moon, Sun, Car, Bus, Tent, Phone, Users, Sparkles, FileText, Leaf, Eye
} from 'lucide-react';

export default function TripPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;

  const { user, token, isLoading: authLoading } = useAuth();

  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [planMetadata, setPlanMetadata] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSavingChecklist, setIsSavingChecklist] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'trails' | 'prep' | 'logistics' | 'wildlife'>('overview');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [showGeminiTools, setShowGeminiTools] = useState(false);
  const [toolLoading, setToolLoading] = useState<string | null>(null);
  const [toolResult, setToolResult] = useState<{ type: string; content: string[] } | null>(null);

  // Load trip plan from real journal entries (trip_plan type)
  useEffect(() => {
    const load = async () => {
      if (authLoading) return;
      if (!user || !token) {
        router.push('/login');
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const res = await getJournalEntries(undefined, 'trip_plan', 200);
        const entries = (res.data?.entries || []) as any[];
        const entry = entries.find((e) => e?.id === planId);

        if (!entry) {
          setPlan(null);
          setChecklist([]);
          setLoadError('Trip plan not found');
          return;
        }

        const meta = entry.meta_data || entry.metadata || {};
        setPlanMetadata(meta);
        const tp = meta.trip_plan_data || {};
        const planData = tp.plan || {};

        // Flatten checklist categories -> ChecklistItem[]
        const checklistByCat = planData.checklist || {};
        const completedItems: string[] = Array.isArray(meta.completed_checklist_items)
          ? meta.completed_checklist_items
          : [];

        const categoryMap: Record<string, ChecklistItem['category']> = {
          documentation: 'permits',
          accommodation: 'logistics',
          transportation: 'logistics',
          equipment: 'gear',
          health_safety: 'safety',
          communication: 'safety',
          food_water: 'food',
          personal: 'other',
          permits: 'permits',
          gear: 'gear',
          logistics: 'logistics',
          safety: 'safety',
          food: 'food',
          other: 'other',
        };

        const items: ChecklistItem[] = Object.entries(checklistByCat).flatMap(
          ([categoryKey, list]: [string, any]) => {
            const arr: string[] = Array.isArray(list) ? list : [];
            const mappedCategory = categoryMap[categoryKey] || 'other';
            return arr.map((item: string, idx: number) => ({
              id: `${categoryKey}-${idx}`,
              category: mappedCategory,
              item,
              completed: completedItems.includes(item),
              required: true,
            }));
          }
        );

        const visitDate = meta.visit_date || tp.visit_date || entry.created_at;
        const placeName = meta.place_name || tp.place_name || 'Trip';

        const parsedPlan: TripPlan = {
          id: entry.id,
          name: entry.title || `Trip Plan: ${placeName}`,
          parkName: meta.place_name || tp.place_name || '',
          parkId: meta.place_id || '',
          startDate: visitDate,
          endDate: visitDate,
          plannedTrails: [],
          checklist: items,
          logistics: { transportation: 'not_set' as const },
          permits: { status: 'not_started' as const, required: false },
          offlineStatus: 'not_downloaded' as const,
          notes: entry.content,
          createdAt: entry.created_at,
          updatedAt: entry.updated_at || entry.created_at,
          weather: tp.place_data?.weather || undefined,
          wildlife: undefined,
          activities: undefined,
        };

        setPlan(parsedPlan);
        setChecklist(items);
      } catch (e: any) {
        console.error('[TripPlanDetail] Failed to load trip plan:', e);
        setLoadError(e?.response?.data?.detail || e?.message || 'Failed to load trip plan');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [authLoading, planId, router, token, user]);

  // Deterministic AI Tool handlers (no Gemini dependency)
  const handleGenerateChecklist = async () => {
    setToolLoading('checklist');
    // Simulate brief delay for UX
    await new Promise(r => setTimeout(r, 500));
    
    // Generate deterministic checklist based on trip data
    const newItems: ChecklistItem[] = [
      { id: `gen-${Date.now()}-1`, item: 'Check weather forecast for trip dates', completed: false, category: 'other', required: false },
      { id: `gen-${Date.now()}-2`, item: 'Verify trail conditions and closures', completed: false, category: 'safety', required: true },
      { id: `gen-${Date.now()}-3`, item: 'Pack first aid kit', completed: false, category: 'gear', required: true },
      { id: `gen-${Date.now()}-4`, item: 'Bring 2L water per person', completed: false, category: 'food', required: true },
      { id: `gen-${Date.now()}-5`, item: 'Pack layers for temperature changes', completed: false, category: 'gear', required: false },
      { id: `gen-${Date.now()}-6`, item: 'Download offline maps', completed: false, category: 'logistics', required: false },
      { id: `gen-${Date.now()}-7`, item: 'Share trip itinerary with emergency contact', completed: false, category: 'safety', required: true },
      { id: `gen-${Date.now()}-8`, item: 'Charge devices and bring power bank', completed: false, category: 'gear', required: false },
    ];
    
    setChecklist(prev => [...prev, ...newItems]);
    setToolLoading(null);
    setToolResult({ type: 'checklist', content: ['Added 8 items to your checklist!'] });
    setTimeout(() => setToolResult(null), 3000);
  };

  const handleGenerateLogistics = async () => {
    setToolLoading('logistics');
    await new Promise(r => setTimeout(r, 500));
    
    const trailCount = plan?.plannedTrails?.length || 1;
    const logistics = [
      `🚗 Driving time: Approximately ${Math.round(trailCount * 45)} minutes to trailhead`,
      `🅿️ Parking: Arrive before 8 AM on weekends for best availability`,
      `⏰ Start time: Begin hiking by 7-8 AM to avoid afternoon heat`,
      `🍽️ Food: Pack lunch and snacks for the day`,
      `📍 Nearest services: Check for gas and supplies within 20 miles of trailhead`,
      `📱 Cell coverage: Limited in remote areas, download offline content`,
    ];
    
    setToolLoading(null);
    setToolResult({ type: 'logistics', content: logistics });
  };

  const handleGenerateFieldGuide = async () => {
    setToolLoading('fieldguide');
    await new Promise(r => setTimeout(r, 500));
    
    const fieldGuide = [
      `🌲 Trees: Look for oak, pine, and coastal redwood species`,
      `🌸 Flowers: Spring wildflowers include California poppy, lupine, and paintbrush`,
      `🦌 Wildlife: Common sightings include deer, squirrels, and various bird species`,
      `🪨 Geology: Watch for serpentine outcrops and sandstone formations`,
      `💧 Water: Seasonal creeks may be present - bring water filtration`,
      `🦅 Birds: Listen for jays, hawks, and woodpeckers along the trail`,
    ];
    
    setToolLoading(null);
    setToolResult({ type: 'fieldguide', content: fieldGuide });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center mb-3 mx-auto animate-pulse">
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-slate-600">Loading trip plan…</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Trip plan not found</h1>
          {loadError && <p className="text-sm text-slate-600 mb-3">{loadError}</p>}
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

  const saveCompletedChecklist = async (updatedChecklist: ChecklistItem[]) => {
    // Persist completion by item text (compatible with JournalHomeV2 rendering)
    try {
      setIsSavingChecklist(true);
      const completed = updatedChecklist.filter((i) => i.completed).map((i) => i.item);
      const nextMetadata = {
        ...(planMetadata || {}),
        completed_checklist_items: completed,
      };
      await updateJournalEntry(plan.id, { metadata: nextMetadata });
    } catch (e) {
      console.error('[TripPlanDetail] Failed to save checklist:', e);
      // Non-blocking; UI remains updated locally
    } finally {
      setIsSavingChecklist(false);
    }
  };

  const toggleChecklistItem = (itemId: string) => {
    setChecklist((prev) => {
      const next = prev.map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item));
      // Fire-and-forget persist
      saveCompletedChecklist(next);
      return next;
    });
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const permitStatusColors = {
    not_started: 'bg-slate-200 text-slate-700',
    in_progress: 'bg-amber-100 text-amber-700',
    obtained: 'bg-emerald-100 text-emerald-700',
    not_required: 'bg-slate-100 text-slate-600',
  };

  const offlineStatusColors = {
    not_downloaded: 'bg-slate-200 text-slate-700',
    downloading: 'bg-blue-100 text-blue-700',
    ready: 'bg-emerald-100 text-emerald-700',
    error: 'bg-red-100 text-red-700',
  };

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
              <h1 className="text-2xl font-bold text-slate-800">{plan.name}</h1>
              <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {plan.parkName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(plan.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(plan.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Progress and Quick Actions */}
          <div className="flex items-center gap-3 justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                <span>Checklist: {completedCount}/{totalCount}</span>
                {isSavingChecklist && <span className="text-slate-400">• Saving…</span>}
                <span className="text-slate-400">•</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${permitStatusColors[plan.permits.status]}`}>
                  Permit: {plan.permits.status.replace('_', ' ')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${offlineStatusColors[plan.offlineStatus]}`}>
                  {plan.offlineStatus === 'ready' ? 'Offline ready' : 'Map not downloaded'}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            {plan.offlineStatus !== 'ready' && (
              <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                <Download className="w-4 h-4" />
                Download map
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200 sticky top-[108px] z-20">
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {[
              { key: 'overview', label: 'Overview', icon: Info },
              { key: 'trails', label: 'Trails', icon: Mountain },
              { key: 'prep', label: 'Preparation', icon: CheckCircle2 },
              { key: 'logistics', label: 'Logistics', icon: Car },
              { key: 'wildlife', label: 'Wildlife & Activities', icon: Eye },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'text-orange-600 border-orange-600'
                    : 'text-slate-600 border-transparent hover:text-slate-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
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
            
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {plan.notes && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-800 mb-3">Trip Summary</h2>
                    <p className="text-slate-700 leading-relaxed">{plan.notes}</p>
                  </div>
                )}

                {plan.weather && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <ThermometerSun className="w-5 h-5 text-orange-600" />
                      Weather
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Conditions</p>
                        <p className="text-slate-800 font-medium">{plan.weather.conditions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Temperature Range</p>
                        <p className="text-slate-800 font-medium">{plan.weather.highTemp}° / {plan.weather.lowTemp}°F</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="text-sm text-slate-600">Sunrise</p>
                          <p className="text-slate-800 font-medium">{plan.weather.sunrise}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-indigo-500" />
                        <div>
                          <p className="text-sm text-slate-600">Sunset</p>
                          <p className="text-slate-800 font-medium">{plan.weather.sunset}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-amber-900 mb-1">Safety Reminders</h3>
                      <ul className="text-sm text-amber-800 space-y-1">
                        <li>• Check trail conditions before departure</li>
                        <li>• Carry sufficient water and sun protection</li>
                        <li>• Share your itinerary with someone</li>
                        <li>• Download offline maps before arrival</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Trails Tab */}
            {activeTab === 'trails' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-slate-800">Planned Trails ({plan.plannedTrails.length})</h2>
                </div>
                {plan.plannedTrails.map((trail, index) => (
                  <div key={trail.id} className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-500">Day {index + 1}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            trail.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' :
                            trail.difficulty === 'moderate' ? 'bg-amber-100 text-amber-700' :
                            trail.difficulty === 'hard' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {trail.difficulty}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">{trail.name}</h3>
                        <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {trail.startLocation}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                      <span>{trail.distance} mi</span>
                      <span>•</span>
                      <span>↑ {trail.elevationGain} ft</span>
                    </div>
                    {trail.highlights && trail.highlights.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">Highlights</p>
                        <div className="flex flex-wrap gap-2">
                          {trail.highlights.map((highlight, idx) => (
                            <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Preparation Tab */}
            {activeTab === 'prep' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4">Checklist</h2>
                  <div className="space-y-3">
                    {['permits', 'gear', 'food', 'safety'].map(category => {
                      const items = checklist.filter(item => item.category === category);
                      if (items.length === 0) return null;
                      return (
                        <div key={category}>
                          <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wide mb-2">
                            {category}
                          </h3>
                          <div className="space-y-2">
                            {items.map(item => (
                              <label
                                key={item.id}
                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleChecklistItem(item.id)}
                                  className="flex-shrink-0"
                                >
                                  {item.completed ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-slate-400" />
                                  )}
                                </button>
                                <span className={`flex-1 ${item.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                  {item.item}
                                </span>
                                {item.required && (
                                  <span className="text-xs text-red-600 font-medium">Required</span>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">Packing Tips</h3>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Pack layers for changing weather conditions</li>
                        <li>• Bring 1 liter of water per 2 hours of hiking</li>
                        <li>• Don't forget sun protection and insect repellent</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Logistics Tab */}
            {activeTab === 'logistics' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-600" />
                    Permits & Reservations
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">{plan.permits.permitType}</p>
                        {plan.permits.confirmationNumber && (
                          <p className="text-sm text-slate-600 mt-1">
                            Confirmation: {plan.permits.confirmationNumber}
                          </p>
                        )}
                        {plan.permits.notes && (
                          <p className="text-sm text-slate-600 mt-1">{plan.permits.notes}</p>
                        )}
                        {plan.permits.applicationDate && (
                          <p className="text-xs text-slate-500 mt-1">
                            Applied: {new Date(plan.permits.applicationDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${permitStatusColors[plan.permits.status]}`}>
                        {plan.permits.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {plan.logistics && (
                  <>
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                      <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Car className="w-5 h-5 text-orange-600" />
                        Transportation
                      </h2>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                          {plan.logistics.transportation === 'driving' ? (
                            <Car className="w-5 h-5 text-slate-600" />
                          ) : (
                            <Bus className="w-5 h-5 text-slate-600" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-slate-800 capitalize">
                              {plan.logistics.transportation}
                            </p>
                            {plan.logistics.parkingDetails && (
                              <p className="text-sm text-slate-600 mt-1">{plan.logistics.parkingDetails}</p>
                            )}
                            {plan.logistics.shuttleInfo && (
                              <p className="text-sm text-slate-600 mt-1">{plan.logistics.shuttleInfo}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {plan.logistics.accommodations && (
                      <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                          <Tent className="w-5 h-5 text-orange-600" />
                          Accommodations
                        </h2>
                        <p className="text-slate-700">{plan.logistics.accommodations}</p>
                      </div>
                    )}

                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                      <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Phone className="w-5 h-5 text-orange-600" />
                        Emergency Contacts
                      </h2>
                      <div className="space-y-2">
                        {plan.logistics.emergencyContact && (
                          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <div>
                              <p className="text-sm font-medium text-red-900">Emergency</p>
                              <p className="text-sm text-red-700">{plan.logistics.emergencyContact}</p>
                            </div>
                          </div>
                        )}
                        {plan.logistics.rangersStation && (
                          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Users className="w-5 h-5 text-slate-600" />
                            <div>
                              <p className="text-sm font-medium text-slate-800">Rangers Station</p>
                              <p className="text-sm text-slate-600">{plan.logistics.rangersStation}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Wildlife & Activities Tab */}
            {activeTab === 'wildlife' && (
              <div className="space-y-4">
                {plan.wildlife && plan.wildlife.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Leaf className="w-5 h-5 text-emerald-600" />
                      Likely Wildlife
                    </h2>
                    <div className="space-y-3">
                      {plan.wildlife.map((animal, index) => (
                        <div key={index} className="p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-slate-800">{animal.species}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              animal.likelihood === 'high' ? 'bg-emerald-100 text-emerald-700' :
                              animal.likelihood === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {animal.likelihood} likelihood
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">
                            <span className="font-medium">Season:</span> {animal.season} • <span className="font-medium">Best time:</span> {animal.bestTime}
                          </p>
                          {animal.tips && (
                            <p className="text-sm text-slate-600 italic">{animal.tips}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {plan.activities && plan.activities.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Eye className="w-5 h-5 text-orange-600" />
                      Suggested Activities
                    </h2>
                    <div className="space-y-3">
                      {plan.activities.map((activity, index) => (
                        <div key={index} className="p-4 bg-gradient-to-r from-orange-50 to-rose-50 rounded-lg">
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="font-medium text-slate-800">{activity.name}</h3>
                            {activity.difficulty && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white text-slate-700">
                                {activity.difficulty}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 mb-2">{activity.description}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {activity.location}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {activity.timing}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!plan.wildlife || plan.wildlife.length === 0) && (!plan.activities || plan.activities.length === 0) && (
                  <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                    <Leaf className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">Wildlife and activity information coming soon</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gemini Tools Sidebar */}
          <aside className="w-72 flex-shrink-0 hidden lg:block">
            <div className="sticky top-[180px]">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-slate-800">AI Tools</h3>
                </div>
                <div className="space-y-2">
                  <button 
                    onClick={handleGenerateChecklist}
                    disabled={toolLoading === 'checklist'}
                    className="w-full px-4 py-2.5 bg-white hover:bg-purple-50 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left flex items-center justify-between disabled:opacity-50"
                  >
                    <span>{toolLoading === 'checklist' ? 'Generating...' : 'Generate checklist'}</span>
                    <Sparkles className={`w-4 h-4 text-purple-600 ${toolLoading === 'checklist' ? 'animate-spin' : ''}`} />
                  </button>
                  <button 
                    onClick={handleGenerateLogistics}
                    disabled={toolLoading === 'logistics'}
                    className="w-full px-4 py-2.5 bg-white hover:bg-purple-50 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left flex items-center justify-between disabled:opacity-50"
                  >
                    <span>{toolLoading === 'logistics' ? 'Generating...' : 'Generate logistics plan'}</span>
                    <Sparkles className={`w-4 h-4 text-purple-600 ${toolLoading === 'logistics' ? 'animate-spin' : ''}`} />
                  </button>
                  <button 
                    onClick={handleGenerateFieldGuide}
                    disabled={toolLoading === 'fieldguide'}
                    className="w-full px-4 py-2.5 bg-white hover:bg-purple-50 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left flex items-center justify-between disabled:opacity-50"
                  >
                    <span>{toolLoading === 'fieldguide' ? 'Generating...' : 'Generate field guide'}</span>
                    <Sparkles className={`w-4 h-4 text-purple-600 ${toolLoading === 'fieldguide' ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                {/* Tool Result Display */}
                {toolResult && (
                  <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
                    <h4 className="text-xs font-semibold text-purple-700 uppercase mb-2">
                      {toolResult.type === 'checklist' ? '✅ Checklist' : toolResult.type === 'logistics' ? '🚗 Logistics' : '🌿 Field Guide'}
                    </h4>
                    <ul className="space-y-1">
                      {toolResult.content.map((item, i) => (
                        <li key={i} className="text-xs text-slate-600">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                  Smart tools to help plan your trip with personalized recommendations.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile Gemini Tools FAB */}
      <button
        onClick={() => setShowGeminiTools(!showGeminiTools)}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:scale-105 transition-transform"
        aria-label="AI Tools"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Mobile Gemini Tools Bottom Sheet */}
      {showGeminiTools && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowGeminiTools(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-slate-800">AI Tools</h3>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => { handleGenerateChecklist(); setShowGeminiTools(false); }}
                disabled={toolLoading === 'checklist'}
                className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left disabled:opacity-50"
              >
                {toolLoading === 'checklist' ? 'Generating...' : 'Generate checklist'}
              </button>
              <button 
                onClick={() => { handleGenerateLogistics(); setShowGeminiTools(false); }}
                disabled={toolLoading === 'logistics'}
                className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left disabled:opacity-50"
              >
                {toolLoading === 'logistics' ? 'Generating...' : 'Generate logistics plan'}
              </button>
              <button 
                onClick={() => { handleGenerateFieldGuide(); setShowGeminiTools(false); }}
                disabled={toolLoading === 'fieldguide'}
                className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left disabled:opacity-50"
              >
                {toolLoading === 'fieldguide' ? 'Generating...' : 'Generate field guide'}
              </button>
            </div>
            
            {/* Mobile Tool Result */}
            {toolResult && (
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <h4 className="text-sm font-semibold text-purple-700 mb-2">
                  {toolResult.type === 'checklist' ? '✅ Result' : toolResult.type === 'logistics' ? '🚗 Logistics' : '🌿 Field Guide'}
                </h4>
                <ul className="space-y-1">
                  {toolResult.content.map((item, i) => (
                    <li key={i} className="text-sm text-slate-600">{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { 
  X, Map as MapIcon, TrendingUp, Footprints, Clock, Mountain, 
  Leaf, PawPrint, Mountain as MountainIcon, BookOpen, Download,
  AlertTriangle, Cloud, Wind, Camera, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatMiles, formatFeet, formatHours, formatDuration, getTrailDisplayName } from '@/lib/formatting';

interface TrailDetailPanelProps {
  trail: {
    id?: string;
    name?: string;
    difficulty?: string;
    distance?: number | null;
    elevationGain?: number | null;
    estimatedTime?: number | null;
    loopType?: string;
    surface?: string;
    description?: string;
    shade?: string;
    conditions?: {
      weather?: string;
      temperature?: number;
      wind?: string;
      alerts?: string[];
    };
    wildlife?: string[];
    vegetation?: string[];
    geology?: string[];
    history?: string[];
    safety?: string[];
    recentActivity?: {
      date: string;
      note: string;
      user: string;
    }[];
    photos?: string[];
  };
  onClose: () => void;
  onStartHike: () => void;
}

const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  hard: 'bg-orange-100 text-orange-700 border-orange-200',
  expert: 'bg-red-100 text-red-700 border-red-200',
};

export function TrailDetailPanel({ trail, onClose, onStartHike }: TrailDetailPanelProps) {
  const [showElevation, setShowElevation] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  const difficultyColor = DIFFICULTY_COLORS[trail.difficulty?.toLowerCase() as keyof typeof DIFFICULTY_COLORS] || DIFFICULTY_COLORS.moderate;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 lg:right-0 lg:top-0 lg:left-auto lg:w-[480px] bg-white z-50 shadow-2xl overflow-y-auto lg:rounded-none rounded-t-3xl max-h-[85vh] lg:max-h-full animate-in slide-in-from-bottom lg:slide-in-from-right duration-300">
        {/* Fixed Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 z-10">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 pr-3">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  {trail.name || 'Trail Details'}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-full text-sm font-medium border ${difficultyColor}`}>
                    {trail.difficulty || 'Moderate'}
                  </span>
                  {trail.loopType && (
                    <span className="text-sm text-slate-600">
                      {trail.loopType}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Distance</p>
                <p className="text-lg font-bold text-slate-800">{formatMiles(trail.distance)}</p>
                <p className="text-xs text-slate-500">miles</p>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Elevation</p>
                <p className="text-lg font-bold text-slate-800">{formatFeet(trail.elevationGain)}</p>
                <p className="text-xs text-slate-500">ft gain</p>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Time</p>
                <p className="text-lg font-bold text-slate-800">{formatHours(trail.estimatedTime)}</p>
                <p className="text-xs text-slate-500">hours</p>
              </div>
            </div>

            {/* Start Hike CTA */}
            <button
              onClick={onStartHike}
              className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold text-lg shadow-sm"
            >
              Start Hike
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4">
          {/* Description */}
          {trail.description && (
            <div>
              <p className="text-slate-700 leading-relaxed">{trail.description}</p>
            </div>
          )}

          {/* Trail Map Section */}
          <div className="bg-slate-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-orange-600" />
                Trail Map
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowElevation(!showElevation)}
                  className="text-xs px-3 py-1.5 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  {showElevation ? 'Hide' : 'Show'} Elevation
                </button>
              </div>
            </div>
            
            {/* Map Placeholder */}
            <div className="aspect-video bg-slate-200 rounded-lg flex items-center justify-center mb-3">
              <MapIcon className="w-12 h-12 text-slate-400" />
            </div>

            {/* Elevation Profile */}
            {showElevation && (
              <div className="bg-white rounded-lg p-3">
                <div className="h-24 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center">
                  {trail.elevationGain && trail.elevationGain > 0 ? (
                    <svg
                      viewBox="0 0 200 60"
                      className="w-full h-full"
                      preserveAspectRatio="none"
                    >
                      <path
                        d={`M 0,60 Q 50,${60 - (trail.elevationGain / 80)}, 100,${40 - (trail.elevationGain / 120)} T 200,${50 - (trail.elevationGain / 160)}`}
                        fill="none"
                        stroke="#ea580c"
                        strokeWidth="2"
                      />
                      <path
                        d={`M 0,60 Q 50,${60 - (trail.elevationGain / 80)}, 100,${40 - (trail.elevationGain / 120)} T 200,${50 - (trail.elevationGain / 160)} L 200,60 Z`}
                        fill="rgba(234, 88, 12, 0.1)"
                      />
                    </svg>
                  ) : (
                    <p className="text-sm text-slate-400">No elevation data available</p>
                  )}
                </div>
              </div>
            )}

            {/* Download Button */}
            <button className="w-full mt-3 py-2 px-4 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download Offline Map
            </button>
          </div>

          {/* Trail Essentials Grid */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Trail Essentials</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Surface</p>
                  <p className="text-sm font-medium text-slate-800">{trail.surface || 'Mixed'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Shade</p>
                  <p className="text-sm font-medium text-slate-800">{trail.shade || 'Moderate'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Conditions Card */}
          {trail.conditions && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-600" />
                Current Conditions
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-slate-500">Weather</p>
                  <p className="text-sm font-medium text-slate-800">{trail.conditions.weather || '–'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Temperature</p>
                  <p className="text-sm font-medium text-slate-800">
                    {trail.conditions.temperature ? `${trail.conditions.temperature}°F` : '–'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Wind</p>
                  <p className="text-sm font-medium text-slate-800">{trail.conditions.wind || '–'}</p>
                </div>
              </div>
              {trail.conditions.alerts && trail.conditions.alerts.length > 0 && (
                <div className="pt-3 border-t border-blue-200">
                  {trail.conditions.alerts.map((alert, idx) => (
                    <p key={idx} className="text-sm text-blue-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {alert}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* What You'll See */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-800">What You'll See</h3>
            
            {/* Wildlife */}
            {trail.wildlife && trail.wildlife.length > 0 && (
              <button
                onClick={() => toggleSection('wildlife')}
                className="w-full text-left"
              >
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 hover:bg-emerald-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PawPrint className="w-4 h-4 text-emerald-700" />
                      <span className="font-medium text-slate-800">Wildlife</span>
                      <span className="text-xs text-slate-500">({trail.wildlife.length})</span>
                    </div>
                    {expandedSection === 'wildlife' ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  {expandedSection === 'wildlife' && (
                    <div className="mt-2 pt-2 border-t border-emerald-200">
                      <ul className="text-sm text-slate-700 space-y-1">
                        {trail.wildlife.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </button>
            )}

            {/* Vegetation */}
            {trail.vegetation && trail.vegetation.length > 0 && (
              <button
                onClick={() => toggleSection('vegetation')}
                className="w-full text-left"
              >
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 hover:bg-green-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-green-700" />
                      <span className="font-medium text-slate-800">Vegetation</span>
                      <span className="text-xs text-slate-500">({trail.vegetation.length})</span>
                    </div>
                    {expandedSection === 'vegetation' ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  {expandedSection === 'vegetation' && (
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <ul className="text-sm text-slate-700 space-y-1">
                        {trail.vegetation.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </button>
            )}

            {/* Geology */}
            {trail.geology && trail.geology.length > 0 && (
              <button
                onClick={() => toggleSection('geology')}
                className="w-full text-left"
              >
                <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 hover:bg-slate-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MountainIcon className="w-4 h-4 text-slate-700" />
                      <span className="font-medium text-slate-800">Geology</span>
                      <span className="text-xs text-slate-500">({trail.geology.length})</span>
                    </div>
                    {expandedSection === 'geology' ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  {expandedSection === 'geology' && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <ul className="text-sm text-slate-700 space-y-1">
                        {trail.geology.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </button>
            )}

            {/* History */}
            {trail.history && trail.history.length > 0 && (
              <button
                onClick={() => toggleSection('history')}
                className="w-full text-left"
              >
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 hover:bg-amber-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-700" />
                      <span className="font-medium text-slate-800">History</span>
                      <span className="text-xs text-slate-500">({trail.history.length})</span>
                    </div>
                    {expandedSection === 'history' ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  {expandedSection === 'history' && (
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <ul className="text-sm text-slate-700 space-y-1">
                        {trail.history.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </button>
            )}
          </div>

          {/* Safety Notes */}
          {trail.safety && trail.safety.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Safety Notes
              </h3>
              <ul className="text-sm text-red-900 space-y-1">
                {trail.safety.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-600 flex-shrink-0">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Community Section */}
          {trail.recentActivity && trail.recentActivity.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Recent Hiker Notes</h3>
              <div className="space-y-3">
                {trail.recentActivity.map((activity, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-800 text-sm">{activity.user}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(activity.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{activity.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photos Gallery */}
          {trail.photos && trail.photos.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Camera className="w-5 h-5 text-orange-600" />
                Photos
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {trail.photos.map((photo, idx) => (
                  <div key={idx} className="aspect-square bg-slate-200 rounded-lg overflow-hidden">
                    {/* Photo placeholder */}
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-8 h-8 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

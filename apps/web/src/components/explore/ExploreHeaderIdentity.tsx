'use client';

import { Mountain, Award, TrendingUp } from 'lucide-react';

interface ExploreHeaderIdentityProps {
  userName?: string;
  explorerLevel: string;
  nextMilestone: string;
  currentPoints: number;
  milestonePoints: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Get badge colors based on explorer level
function getLevelBadgeStyle(level: string): { bg: string; text: string; border: string; icon: string } {
  const normalized = level.toLowerCase();
  
  if (normalized.includes('expert') || normalized.includes('master')) {
    return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: '🏔️' };
  }
  if (normalized.includes('advanced') || normalized.includes('explorer')) {
    return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: '🧭' };
  }
  if (normalized.includes('adventurer') || normalized.includes('intermediate')) {
    return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: '⛰️' };
  }
  // Default: Beginner
  return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: '🥾' };
}

export function ExploreHeaderIdentity({
  userName,
  explorerLevel,
  nextMilestone,
  currentPoints,
  milestonePoints,
}: ExploreHeaderIdentityProps) {
  const firstName = userName?.split(' ')[0] || 'Explorer';
  const progressPercent = Math.min((currentPoints / milestonePoints) * 100, 100);
  const badgeStyle = getLevelBadgeStyle(explorerLevel);

  return (
    <div className="mb-6">
      {/* Greeting and Level Row */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-light text-slate-800 mb-1">
            {getGreeting()}, <span className="font-medium">{firstName}</span>
          </h1>
        </div>
        
        {/* Explorer Level Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${badgeStyle.bg} ${badgeStyle.border}`}>
          <span className="text-sm">{badgeStyle.icon}</span>
          <span className={`text-sm font-semibold ${badgeStyle.text}`}>
            {explorerLevel}
          </span>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-slate-700">Next milestone</span>
          </div>
          <span className="text-slate-500">
            {currentPoints} / {milestonePoints} XP
          </span>
        </div>
        
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <p className="text-xs text-slate-500">{nextMilestone}</p>
      </div>
    </div>
  );
}

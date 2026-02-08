'use client';

/**
 * DiscoveryQuest Component
 * Pokemon Go-style quest tracker for trail completion
 * 
 * Users must find specific items along the trail to complete it.
 * Provides gamification and encourages exploration.
 */

import React from 'react';
import { CheckCircle2, Circle, Star, Lock, Zap, Target, Trophy, Sparkles } from 'lucide-react';

interface QuestItem {
  id: string;
  name: string;
  category: 'plant' | 'animal' | 'bird' | 'geology' | 'landmark' | 'water';
  hint: string;
  xp: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  completed: boolean;
  imageUrl?: string;
}

interface DiscoveryQuestProps {
  trailName: string;
  questItems: QuestItem[];
  totalXp: number;
  earnedXp: number;
  completionBonus: number;
  onItemClick: (item: QuestItem) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  plant: '🌿',
  animal: '🦌',
  bird: '🦅',
  geology: '🪨',
  landmark: '🏔️',
  water: '💧',
};

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  common: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-600' },
  uncommon: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-600' },
  rare: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-600' },
  legendary: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-600' },
};

export function DiscoveryQuest({
  trailName,
  questItems,
  totalXp,
  earnedXp,
  completionBonus,
  onItemClick,
}: DiscoveryQuestProps) {
  const completedCount = questItems.filter(item => item.completed).length;
  const progressPercent = questItems.length > 0 ? (completedCount / questItems.length) * 100 : 0;
  const isComplete = completedCount === questItems.length && questItems.length > 0;

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-pineGreen to-mossGreen p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5" />
          <span className="text-sm font-medium uppercase tracking-wide opacity-80">Trail Quest</span>
        </div>
        <h2 className="font-display text-2xl mb-1">{trailName}</h2>
        <p className="text-white/70 text-sm">Find all discoveries to complete the quest</p>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>{completedCount} / {questItems.length} discovered</span>
            <span className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-amber-300" />
              {earnedXp} / {totalXp} XP
            </span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-300 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quest Items */}
      <div className="p-4 space-y-3">
        {questItems.map((item, index) => {
          const rarityColors = RARITY_COLORS[item.rarity];
          const isLocked = index > 0 && !questItems[index - 1].completed && item.rarity === 'legendary';
          
          return (
            <button
              key={item.id}
              onClick={() => !isLocked && onItemClick(item)}
              disabled={item.completed || isLocked}
              className={`w-full p-4 rounded-2xl border-2 transition-all ${
                item.completed
                  ? 'bg-emerald-50 border-emerald-300'
                  : isLocked
                  ? 'bg-slate-100 border-slate-200 opacity-60'
                  : `${rarityColors.bg} ${rarityColors.border} hover:shadow-md`
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Status Icon */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  item.completed
                    ? 'bg-emerald-500 text-white'
                    : isLocked
                    ? 'bg-slate-300 text-slate-500'
                    : 'bg-white shadow-sm text-2xl'
                }`}>
                  {item.completed ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : isLocked ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    CATEGORY_ICONS[item.category]
                  )}
                </div>

                {/* Item Info */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium ${
                      item.completed ? 'text-emerald-700 line-through' : 'text-slate-800'
                    }`}>
                      {item.completed || !isLocked ? item.name : '???'}
                    </span>
                    {item.rarity !== 'common' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rarityColors.bg} ${rarityColors.text}`}>
                        {item.rarity}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {item.completed 
                      ? '✓ Discovered!' 
                      : isLocked 
                      ? 'Complete previous quests to unlock'
                      : item.hint
                    }
                  </p>
                </div>

                {/* XP Reward */}
                <div className={`flex items-center gap-1 ${
                  item.completed ? 'text-emerald-500' : 'text-amber-500'
                }`}>
                  <Zap className="w-4 h-4" />
                  <span className="font-bold">{item.xp}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Completion Bonus */}
      <div className={`mx-4 mb-4 p-4 rounded-2xl border-2 border-dashed ${
        isComplete ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-slate-50'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isComplete ? 'bg-amber-400 text-white' : 'bg-white text-slate-400'
          }`}>
            {isComplete ? (
              <Trophy className="w-6 h-6" />
            ) : (
              <Circle className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1">
            <span className={`font-medium ${isComplete ? 'text-amber-700' : 'text-slate-500'}`}>
              Quest Completion Bonus
            </span>
            <p className="text-sm text-slate-500">
              {isComplete ? 'Congratulations! Quest complete!' : 'Find all discoveries to unlock'}
            </p>
          </div>
          <div className={`flex items-center gap-1 ${
            isComplete ? 'text-amber-500' : 'text-slate-400'
          }`}>
            <Star className="w-4 h-4" />
            <span className="font-bold">+{completionBonus}</span>
          </div>
        </div>
      </div>

      {/* Complete Quest Action */}
      {isComplete && (
        <div className="p-4 bg-gradient-to-r from-amber-100 to-yellow-100">
          <div className="flex items-center justify-center gap-2 text-amber-700">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold">All discoveries found! Trail mastered!</span>
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      )}
    </div>
  );
}

// Generate quest items for a trail based on location and trail data
export function generateQuestItems(
  trailId: string,
  trailName: string,
  hints: Array<{ name: string; category: string; likelihood: string; hint: string; xp: number }>
): QuestItem[] {
  return hints.map((hint, index) => ({
    id: `quest-${trailId}-${index}`,
    name: hint.name,
    category: hint.category as QuestItem['category'],
    hint: hint.hint,
    xp: hint.xp,
    rarity: hint.xp >= 80 ? 'legendary' : hint.xp >= 50 ? 'rare' : hint.xp >= 30 ? 'uncommon' : 'common',
    completed: false,
  }));
}

export default DiscoveryQuest;

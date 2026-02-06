'use client';

/**
 * FieldGuideSheet - Bottom sheet showing discovery nodes and progress
 */

import React, { useState } from 'react';
import { DiscoveryNodeWithStatus, DiscoveryCapture, DISCOVERY_CATEGORIES, RARITY_CONFIG, DiscoveryCategory } from '@/types/hikeMode';

interface FieldGuideSheetProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: DiscoveryNodeWithStatus[];
  captures: DiscoveryCapture[];
  onNodeSelect: (node: DiscoveryNodeWithStatus) => void;
}

export function FieldGuideSheet({
  isOpen,
  onClose,
  nodes,
  captures,
  onNodeSelect,
}: FieldGuideSheetProps) {
  const [selectedCategory, setSelectedCategory] = useState<DiscoveryCategory | 'all'>('all');

  if (!isOpen) return null;

  const capturedIds = new Set(captures.map(c => c.nodeId));
  
  const filteredNodes = nodes.filter(node => 
    selectedCategory === 'all' || node.category === selectedCategory
  );

  const categories = Object.keys(DISCOVERY_CATEGORIES) as DiscoveryCategory[];
  
  const getCategoryCount = (cat: DiscoveryCategory) => {
    return nodes.filter(n => n.category === cat).length;
  };

  const getCapturedCount = (cat: DiscoveryCategory) => {
    return nodes.filter(n => n.category === cat && capturedIds.has(n.id)).length;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 100) return `${Math.round(meters)}m`;
    if (meters < 1000) return `${Math.round(meters / 10) * 10}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const totalXP = nodes.reduce((sum, n) => sum + (capturedIds.has(n.id) ? n.xp : 0), 0);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-2xl text-pineGreen">Field Guide</h2>
              <p className="text-sm text-textSecondary">
                {capturedIds.size} of {nodes.length} discoveries · {totalXP} XP
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-pineGreen text-white'
                  : 'bg-gray-100 text-textSecondary hover:bg-gray-200'
              }`}
            >
              All ({nodes.length})
            </button>
            {categories.map(cat => {
              const info = DISCOVERY_CATEGORIES[cat];
              const count = getCategoryCount(cat);
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'bg-pineGreen text-white'
                      : 'bg-gray-100 text-textSecondary hover:bg-gray-200'
                  }`}
                >
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                  <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Node List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredNodes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-textSecondary">No discoveries in this category yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNodes.map(node => {
                const isCaptured = capturedIds.has(node.id);
                const categoryInfo = DISCOVERY_CATEGORIES[node.category];
                const rarityInfo = RARITY_CONFIG[node.rarity];

                return (
                  <button
                    key={node.id}
                    onClick={() => !isCaptured && onNodeSelect(node)}
                    disabled={isCaptured}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isCaptured
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : node.status === 'nearby'
                        ? 'bg-discoveryGold/10 border-discoveryGold hover:bg-discoveryGold/20'
                        : 'bg-white border-gray-200 hover:border-mossGreen hover:bg-mossGreen/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Category Icon */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ backgroundColor: `${categoryInfo.color}20` }}
                      >
                        {categoryInfo.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-text truncate">{node.title}</h3>
                          {isCaptured && (
                            <span className="text-mossGreen text-sm">✓</span>
                          )}
                        </div>
                        <p className="text-sm text-textSecondary line-clamp-2 mb-2">
                          {node.shortFact}
                        </p>
                        <div className="flex items-center gap-3 text-xs">
                          <span 
                            className="px-2 py-0.5 rounded-full font-medium"
                            style={{ 
                              backgroundColor: `${rarityInfo.color}20`,
                              color: rarityInfo.color 
                            }}
                          >
                            {rarityInfo.label}
                          </span>
                          <span className="text-discoveryGold font-medium">+{node.xp} XP</span>
                          {node.status === 'nearby' && !isCaptured && (
                            <span className="text-discoveryGold animate-pulse">📍 Nearby!</span>
                          )}
                          {node.distanceMeters < 9999 && (
                            <span className="text-textSecondary">
                              {formatDistance(node.distanceMeters)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      {!isCaptured && (
                        <div className="text-gray-400 self-center">
                          →
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

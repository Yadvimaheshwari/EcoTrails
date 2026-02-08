'use client';

/**
 * NearbyToast - Toast when approaching a discovery node
 */

import React from 'react';
import { DiscoveryNode, DISCOVERY_CATEGORIES, RARITY_CONFIG } from '@/types/hikeMode';

interface NearbyToastProps {
  node: DiscoveryNode | null;
  onCapture: () => void;
  onDismiss: () => void;
}

export function NearbyToast({ node, onCapture, onDismiss }: NearbyToastProps) {
  if (!node) return null;

  const categoryInfo = DISCOVERY_CATEGORIES[node.category];
  const rarityInfo = RARITY_CONFIG[node.rarity];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 toast-enter">
      <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-4 min-w-[300px] max-w-[400px] border-2 border-discoveryGold">
        {/* Category Icon */}
        <div 
          className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 animate-pulse"
          style={{ backgroundColor: `${categoryInfo.color}20` }}
        >
          {categoryInfo.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-discoveryGold uppercase tracking-wide">
              Nearby!
            </span>
            <span 
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ 
                backgroundColor: `${rarityInfo.color}20`,
                color: rarityInfo.color 
              }}
            >
              {rarityInfo.label}
            </span>
          </div>
          <div className="font-medium text-pineGreen truncate">{node.title}</div>
          <div className="text-sm text-discoveryGold font-medium">+{node.xp} XP</div>
        </div>

        {/* Capture Button */}
        <button
          onClick={onCapture}
          className="px-4 py-2 bg-discoveryGold text-white rounded-xl font-medium text-sm hover:bg-discoveryGold/90 transition-colors flex-shrink-0"
        >
          Capture
        </button>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs hover:bg-gray-300 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

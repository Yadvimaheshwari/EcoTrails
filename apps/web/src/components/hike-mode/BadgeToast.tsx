'use client';

/**
 * BadgeToast - Celebratory toast when a badge is earned
 */

import React, { useEffect, useState } from 'react';
import { Badge } from '@/types/hikeMode';

interface BadgeToastProps {
  badge: Badge | null;
  visible: boolean;
  onHide: () => void;
}

export function BadgeToast({ badge, visible, onHide }: BadgeToastProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible && badge) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(onHide, 300);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [visible, badge, onHide]);

  if (!visible || !badge) return null;

  return (
    <div 
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        isAnimating ? 'toast-enter' : 'toast-exit'
      }`}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-4 min-w-[280px] max-w-[360px] border border-discoveryGold/30">
        {/* Badge Icon */}
        <div className="w-16 h-16 bg-discoveryGold/20 rounded-xl flex items-center justify-center badge-earned">
          <span className="text-4xl">{badge.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="text-xs font-medium text-discoveryGold uppercase tracking-wide mb-0.5">
            Badge Earned!
          </div>
          <div className="font-display text-lg text-pineGreen leading-tight">
            {badge.name}
          </div>
          <div className="text-sm text-textSecondary mt-1">
            +{badge.xp} XP
          </div>
        </div>

        {/* Sparkle decoration */}
        <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
          ✨
        </div>
      </div>
    </div>
  );
}

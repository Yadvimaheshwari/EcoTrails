/**
 * BadgeToast Component
 * Animated toast showing badge award when user captures a discovery
 * Features a celebratory animation with the badge floating and landing
 */

'use client';

import { useEffect, useState } from 'react';
import { Badge, BadgeAward, BADGE_LEVEL_COLORS, BADGE_RARITY_COLORS } from '@/types/badge';

interface BadgeToastProps {
  award: BadgeAward | null;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function BadgeToast({
  award,
  onDismiss,
  autoDismissMs = 5000,
}: BadgeToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (award) {
      setIsVisible(true);
      setIsAnimating(true);

      // End animation after initial phase
      const animTimer = setTimeout(() => {
        setIsAnimating(false);
      }, 1500);

      // Auto dismiss
      const dismissTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
      }, autoDismissMs);

      return () => {
        clearTimeout(animTimer);
        clearTimeout(dismissTimer);
      };
    }
  }, [award, autoDismissMs, onDismiss]);

  if (!award) return null;

  const { badge, isNew, previousLevel, message } = award;
  const levelColor = BADGE_LEVEL_COLORS[badge.level];
  const rarityColor = BADGE_RARITY_COLORS[badge.rarity];

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop particles */}
      {isAnimating && (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: i % 2 === 0 ? levelColor : rarityColor,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `particle ${1 + Math.random()}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Badge Card */}
      <div
        className={`bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto max-w-sm w-full transform transition-all duration-500 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-4'
        }`}
        style={{
          animation: isAnimating ? 'badgeBounce 0.8s ease-out' : undefined,
        }}
      >
        {/* Gradient Header */}
        <div
          className="relative py-8 px-6 text-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${levelColor}20 0%, ${rarityColor}20 100%)`,
          }}
        >
          {/* Shimmer Effect */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `linear-gradient(90deg, transparent, ${levelColor}50, transparent)`,
              animation: isAnimating ? 'shimmer 1.5s ease-in-out infinite' : undefined,
            }}
          />

          {/* Badge Icon */}
          <div
            className="relative mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-4"
            style={{
              backgroundColor: `${levelColor}30`,
              boxShadow: `0 0 0 4px ${levelColor}40, 0 0 30px ${levelColor}50`,
              animation: isAnimating ? 'badgePulse 1s ease-in-out' : undefined,
            }}
          >
            <span className="text-5xl">{badge.icon}</span>
          </div>

          {/* New Badge Label */}
          {isNew && (
            <div
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mb-3"
              style={{
                backgroundColor: rarityColor,
                color: 'white',
                animation: isAnimating ? 'badgePop 0.5s ease-out 0.3s backwards' : undefined,
              }}
            >
              <span>✨</span>
              NEW BADGE!
            </div>
          )}

          {/* Level Up Label */}
          {previousLevel && !isNew && (
            <div
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mb-3"
              style={{
                backgroundColor: levelColor,
                color: 'white',
              }}
            >
              <span>⬆️</span>
              LEVEL UP!
            </div>
          )}

          {/* Badge Name */}
          <h2
            className="text-2xl font-bold text-slate-900 mb-1"
            style={{
              animation: isAnimating ? 'fadeInUp 0.5s ease-out 0.2s backwards' : undefined,
            }}
          >
            {badge.name}
          </h2>

          {/* Badge Level */}
          <p
            className="text-sm font-medium capitalize"
            style={{
              color: levelColor,
              animation: isAnimating ? 'fadeInUp 0.5s ease-out 0.3s backwards' : undefined,
            }}
          >
            {badge.level} Level
          </p>
        </div>

        {/* Description */}
        <div className="px-6 py-4 text-center">
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            {badge.description}
          </p>

          {/* Award Message */}
          <p className="text-sm font-medium text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl">
            {message}
          </p>
        </div>

        {/* Dismiss Button */}
        <div className="px-6 pb-6">
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium transition-all hover:bg-slate-800 active:scale-[0.98]"
          >
            Awesome! 🎉
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes badgeBounce {
          0% {
            transform: scale(0.3) translateY(100px);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) translateY(-20px);
          }
          70% {
            transform: scale(0.95) translateY(10px);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        @keyframes badgePulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes badgePop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          0% {
            transform: translateY(10px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes particle {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Mini Badge Indicator
 * Small badge count indicator for the hike UI
 */
interface BadgeCountProps {
  count: number;
  onClick?: () => void;
}

export function BadgeCount({ count, onClick }: BadgeCountProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 rounded-full hover:bg-amber-200 transition-colors"
    >
      <span className="text-lg">🏅</span>
      <span className="text-sm font-semibold text-amber-800">{count}</span>
    </button>
  );
}

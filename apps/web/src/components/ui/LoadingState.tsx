'use client';

import React, { useEffect, useRef } from 'react';

interface LoadingStateProps {
  message?: string;
  variant?: 'default' | 'shimmer' | 'breathing';
}

export function LoadingState({ message = 'Loading...', variant = 'default' }: LoadingStateProps) {
  const shimmerRef = useRef<HTMLDivElement>(null);
  const breathingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant === 'shimmer' && shimmerRef.current) {
      const animation = shimmerRef.current.animate(
        [
          { opacity: 0.3 },
          { opacity: 0.7 },
          { opacity: 0.3 },
        ],
        {
          duration: 1500,
          iterations: Infinity,
        }
      );
      return () => animation.cancel();
    }

    if (variant === 'breathing' && breathingRef.current) {
      const animation = breathingRef.current.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.1)' },
          { transform: 'scale(1)' },
        ],
        {
          duration: 2000,
          iterations: Infinity,
          easing: 'ease-in-out',
        }
      );
      return () => animation.cancel();
    }
  }, [variant]);

  if (variant === 'shimmer') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-16">
        <div
          ref={shimmerRef}
          className="w-48 h-48 rounded-full bg-stoneGray mb-4"
        />
        <p className="text-base text-textSecondary">{message}</p>
      </div>
    );
  }

  if (variant === 'breathing') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-16">
        <div
          ref={breathingRef}
          className="w-20 h-20 rounded-full bg-pineGreen opacity-30 mb-4"
        />
        <p className="text-base text-textSecondary">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 py-16">
      <div className="w-10 h-10 border-3 border-stoneGray border-t-pineGreen rounded-full animate-spin mb-4" />
      <p className="text-base text-textSecondary">{message}</p>
    </div>
  );
}

'use client';

import React from 'react';

interface MapOverlayProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children?: React.ReactNode;
}

export function MapOverlay({ title, subtitle, onClose, children }: MapOverlayProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-fogWhite rounded-t-3xl shadow-lg">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-2xl font-semibold text-text">{title}</h3>
            {subtitle && (
              <p className="text-sm text-textSecondary mt-1">{subtitle}</p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:opacity-70 transition-opacity"
            >
              <span className="text-2xl">×</span>
            </button>
          )}
        </div>
        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  );
}

'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
}

export function EmptyState({ icon = '🌿', title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-16 px-8">
      <div className="text-6xl mb-6">{icon}</div>
      <h3 className="text-2xl font-semibold mb-2 text-text">{title}</h3>
      <p className="text-base text-textSecondary text-center max-w-sm">{message}</p>
    </div>
  );
}

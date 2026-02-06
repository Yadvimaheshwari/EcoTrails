/**
 * JournalShell Component
 * Shared layout wrapper for all journal pages
 */

'use client';

import { ReactNode } from 'react';

interface JournalShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function JournalShell({ children, title, subtitle, actions }: JournalShellProps) {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F6F8F7 0%, #E8F4F0 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(title || actions) && (
          <div className="mb-8 flex items-start justify-between">
            <div>
              {title && (
                <h1 className="text-3xl font-light mb-2" style={{ color: '#1B1F1E' }}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-base text-gray-600">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex gap-3">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

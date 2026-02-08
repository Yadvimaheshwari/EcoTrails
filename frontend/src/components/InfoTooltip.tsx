'use client';

import { useState } from 'react';

interface InfoTooltipProps {
  content: string;
  title?: string;
}

export function InfoTooltip({ content, title }: InfoTooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-textSecondary hover:text-text transition-colors"
        aria-label="Information"
      >
        <span className="text-lg">ℹ️</span>
      </button>
      {show && (
        <div className="absolute z-50 w-64 p-3 bg-background border border-stoneGray rounded-lg shadow-lg bottom-full left-1/2 transform -translate-x-1/2 mb-2">
          {title && (
            <div className="font-semibold mb-1 text-sm">{title}</div>
          )}
          <div className="text-xs text-textSecondary">{content}</div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-stoneGray"></div>
          </div>
        </div>
      )}
    </div>
  );
}

interface InfoSectionProps {
  title: string;
  content: string;
  icon?: string;
}

export function InfoSection({ title, content, icon = 'ℹ️' }: InfoSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-4 mb-4 border-l-4 border-pineGreen">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold">{title}</span>
        </div>
        <span className="text-textSecondary">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="mt-3 text-sm text-textSecondary">
          {content}
        </div>
      )}
    </div>
  );
}

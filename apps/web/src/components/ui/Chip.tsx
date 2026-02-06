'use client';

import React from 'react';

interface ChipProps {
  label: string;
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

export function Chip({ label, variant = 'default', size = 'md', onClick, className }: ChipProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-full font-medium transition-colors';
  
  const variantClasses = {
    default: 'bg-stoneGray text-text',
    primary: 'bg-pineGreen text-fogWhite',
    accent: 'bg-skyAccent text-fogWhite',
    success: 'bg-success text-fogWhite',
    warning: 'bg-warning text-fogWhite',
    error: 'bg-error text-fogWhite',
  };

  const sizeClasses = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className || ''}`;

  const Component = onClick ? 'button' : 'span';

  return (
    <Component className={classes} onClick={onClick}>
      {label}
    </Component>
  );
}

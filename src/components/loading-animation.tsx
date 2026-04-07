'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingAnimationProps {
  text?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function LoadingAnimation({ text = "Loading...", className, size = 'md' }: LoadingAnimationProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <div className={cn("loading-wave flex items-center", size === 'sm' ? 'h-5' : 'h-10')}>
        <span style={size === 'sm' ? { height: '18px', width: '4px' } : undefined}></span>
        <span style={size === 'sm' ? { height: '18px', width: '4px' } : undefined}></span>
        <span style={size === 'sm' ? { height: '18px', width: '4px' } : undefined}></span>
        <span style={size === 'sm' ? { height: '18px', width: '4px' } : undefined}></span>
        <span style={size === 'sm' ? { height: '18px', width: '4px' } : undefined}></span>
      </div>
      {text && <p className={cn("text-muted-foreground animate-pulse", size === 'sm' ? 'text-xs' : 'text-sm')}>{text}</p>}
    </div>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

export function SplashScreen({ onFinished }: { onFinished: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Total splash screen duration: 4 seconds
    const visibilityTimer = setTimeout(() => {
      setIsVisible(false);
      // Call onFinished slightly after animation starts for smoother transition
      setTimeout(onFinished, 500); // Allow fade-out animation
    }, 4000); // Keep visible for 4 seconds

    return () => {
      clearTimeout(visibilityTimer);
    };
  }, [onFinished]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-1000",
        isVisible ? 'opacity-100' : 'opacity-0 splash-fade-out'
      )}
      aria-hidden={!isVisible}
    >
      <h1 className="text-6xl md:text-8xl font-bold text-primary-foreground select-none">
        <span className="splash-title-m">M</span>OODIFY
      </h1>
      <p className="mt-4 text-lg md:text-xl text-muted-foreground animate-pulse">
        Your Vibe, Your Music.
      </p>
    </div>
  );
}

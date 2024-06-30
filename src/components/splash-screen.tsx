"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function SplashScreen({ onFinished }: { onFinished: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const visibilityTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinished, 550);
    }, 3200);

    return () => {
      clearTimeout(visibilityTimer);
    };
  }, [onFinished]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090b] transition-opacity duration-700",
        isVisible ? "opacity-100" : "opacity-0 splash-fade-out"
      )}
      aria-hidden={!isVisible}
    >
      {/* Subtle ambient glow behind wordmark */}
      <div
        className="pointer-events-none absolute h-64 w-64 rounded-full bg-primary/10 blur-[100px]"
        aria-hidden="true"
      />

      <div className="relative flex flex-col items-center">
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-primary-foreground select-none">
          <span className="splash-title-m">M</span>OODIFY
        </h1>
        <p className="mt-3 text-base md:text-lg text-muted-foreground tracking-wide font-light">
          Your Vibe, Your Music.
        </p>

        <div className="mt-8 h-[2px] w-28 overflow-hidden rounded-full bg-zinc-800/80">
          <div className="splash-progress-bar h-full w-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

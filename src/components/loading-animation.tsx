"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LoadingAnimationProps {
  text?: string;
  className?: string;
  size?: "sm" | "md";
}

export function LoadingAnimation({
  text = "Curating...",
  className,
  size = "md",
}: LoadingAnimationProps) {
  return (
    <div className={cn("inline-flex items-center justify-center gap-2.5", className)}>
      <div
        className={cn(
          "loading-wave flex items-center",
          size === "sm" ? "h-4" : "h-6"
        )}
        aria-hidden="true"
      >
        <span style={size === "sm" ? { height: "13px", width: "2.5px" } : undefined} />
        <span style={size === "sm" ? { height: "13px", width: "2.5px" } : undefined} />
        <span style={size === "sm" ? { height: "13px", width: "2.5px" } : undefined} />
        <span style={size === "sm" ? { height: "13px", width: "2.5px" } : undefined} />
        <span style={size === "sm" ? { height: "13px", width: "2.5px" } : undefined} />
      </div>
      {text && (
        <span className={cn("font-medium", size === "sm" ? "text-sm" : "text-base")}>
          {text}
        </span>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { genres } from "@/config/genres";
import { cn } from "@/lib/utils";
import { Search, X, ChevronDown, ChevronUp } from "lucide-react";

interface GenreSelectorProps {
  selectedGenres: string[];
  onGenreChange: (genre: string, checked: boolean) => void;
  onClearGenres?: () => void;
}

const initialVisibleGenres = [
  "pop",
  "rock",
  "hip-hop",
  "electronic",
  "indie",
  "r-n-b",
  "chill",
  "ambient",
  "jazz",
  "classical",
  "folk",
  "metal",
  "soul",
  "synth-pop",
  "acoustic",
  "indian",
  "k-pop",
  "dance",
];

const validInitialGenres = initialVisibleGenres.filter((g) => genres.includes(g));

export function GenreSelector({
  selectedGenres,
  onGenreChange,
  onClearGenres,
}: GenreSelectorProps) {
  const [showAll, setShowAll] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const genresToShow = React.useMemo(() => {
    if (normalizedQuery.length > 0) {
      return genres.filter((g) =>
        g.replace(/-/g, " ").toLowerCase().includes(normalizedQuery)
      );
    }
    if (showAll) {
      return genres;
    }
    // Keep selected genres visible even when collapsed
    const extraSelected = selectedGenres.filter(
      (g) => !validInitialGenres.includes(g)
    );
    return [...validInitialGenres, ...extraSelected];
  }, [normalizedQuery, showAll, selectedGenres]);

  return (
    <div className="flex w-full flex-col justify-between rounded-xl border border-white/[0.08] bg-zinc-900/50 p-4 sm:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
              02 / Sonic Palette
            </span>
            <h2 className="mt-1 text-lg font-semibold text-zinc-100">
              Genres
            </h2>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <span className="font-mono text-xs text-zinc-400 bg-zinc-800/80 border border-white/[0.06] px-2.5 py-1 rounded-md">
              {selectedGenres.length} selected
            </span>
            {selectedGenres.length > 0 && onClearGenres && (
              <button
                type="button"
                onClick={onClearGenres}
                className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors underline underline-offset-4"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${genres.length} genres (e.g., synth-pop, indie, techno)...`}
            aria-label="Filter genres"
            className="w-full rounded-lg border border-white/[0.08] bg-zinc-950/80 py-2 pl-9 pr-8 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear genre search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Genre Tag Grid */}
        {genresToShow.length > 0 ? (
          <div
            className={cn(
              "flex flex-wrap gap-1.5 sm:gap-2 transition-all",
              showAll &&
                !normalizedQuery &&
                "max-h-[210px] sm:max-h-[260px] overflow-y-auto pr-1"
            )}
          >
            {genresToShow.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  onClick={() => onGenreChange(genre, !isSelected)}
                  className={cn(
                    "inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-all duration-150 select-none",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-white/[0.07] bg-zinc-950/60 text-zinc-300 hover:border-white/20 hover:bg-zinc-900 hover:text-zinc-100"
                  )}
                >
                  {genre.replace(/-/g, " ")}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-zinc-500">
            No genres matching &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </div>

      {/* Expand / Collapse Footer */}
      {!normalizedQuery && (
        <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            {showAll ? (
              <>
                Show curated selection <ChevronUp size={14} />
              </>
            ) : (
              <>
                Browse all {genres.length} genres <ChevronDown size={14} />
              </>
            )}
          </button>
          <span className="font-mono text-[11px] text-zinc-600">
            {showAll ? `${genres.length} total` : `${genresToShow.length} shown`}
          </span>
        </div>
      )}
    </div>
  );
}

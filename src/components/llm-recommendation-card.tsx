"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Disc3, ExternalLink } from "lucide-react";
import type { Song } from "@/app/actions";
import { cn } from "@/lib/utils";

interface LlmRecommendationCardProps {
  song: Song;
  index?: number;
  onOpenSpotifyDock?: (trackId: string, songName: string) => void;
}

const AUDIO_SYNC_EVENT = "moodify:audio-play";

export function LlmRecommendationCard({
  song,
  index = 0,
  onOpenSpotifyDock,
}: LlmRecommendationCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imgError, setImgError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cardId = `${song.name}-${song.artist}-${index}`;

  useEffect(() => {
    const handleOtherPlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id !== cardId && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener(AUDIO_SYNC_EVENT, handleOtherPlay);
    return () => {
      window.removeEventListener(AUDIO_SYNC_EVENT, handleOtherPlay);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [cardId]);

  const togglePlay = () => {
    if (!song.previewUrl) {
      if (song.spotifyTrackId && onOpenSpotifyDock) {
        window.dispatchEvent(
          new CustomEvent(AUDIO_SYNC_EVENT, { detail: { id: cardId } })
        );
        onOpenSpotifyDock(song.spotifyTrackId, `${song.name} — ${song.artist}`);
      }
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio(song.previewUrl);
      audio.volume = 0.85;
      audio.addEventListener("timeupdate", () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      });
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setProgress(0);
      });
      audio.addEventListener("pause", () => {
        setIsPlaying(false);
      });
      audioRef.current = audio;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      window.dispatchEvent(
        new CustomEvent(AUDIO_SYNC_EVENT, { detail: { id: cardId } })
      );
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
          if (song.spotifyTrackId && onOpenSpotifyDock) {
            onOpenSpotifyDock(
              song.spotifyTrackId,
              `${song.name} — ${song.artist}`
            );
          }
        });
    }
  };

  const trackIndexLabel = String(index + 1).padStart(2, "0");
  const showArtwork = Boolean(song.artworkUrl) && !imgError;
  const canPlayInApp = Boolean(song.previewUrl || song.spotifyTrackId);

  return (
    <article
      className={cn(
        "group relative flex flex-row sm:flex-col justify-between overflow-hidden rounded-xl border bg-zinc-900/50 transition-all duration-200",
        isPlaying
          ? "border-primary/60 bg-zinc-900/90 shadow-lg shadow-black/50"
          : "border-white/[0.08] hover:border-white/[0.16] hover:bg-zinc-900/75"
      )}
    >
      {/* Album Sleeve / Cover Art — Compact left square on mobile, full top square on >=sm */}
      <div className="relative w-28 sm:w-full aspect-square shrink-0 overflow-hidden bg-zinc-950">
        {showArtwork ? (
          <Image
            src={song.artworkUrl!}
            alt={`${song.name} by ${song.artist}`}
            width={400}
            height={400}
            onError={() => setImgError(true)}
            className={cn(
              "h-full w-full object-cover transition-transform duration-500",
              isPlaying ? "scale-105" : "group-hover:scale-[1.03]"
            )}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_center,#1c1c21_0%,#09090b_100%)] p-3 sm:p-6 text-center">
            <Disc3
              size={36}
              strokeWidth={1.25}
              className={cn(
                "text-zinc-600 transition-transform duration-700 sm:h-12 sm:w-12",
                isPlaying && "animate-spin text-primary"
              )}
            />
            <span className="mt-2 hidden sm:block font-mono text-[11px] uppercase tracking-widest text-zinc-500 line-clamp-1">
              {song.artist}
            </span>
          </div>
        )}

        {/* Top-left Track Number Badge */}
        <div className="absolute left-2 top-2 sm:left-2.5 sm:top-2.5 rounded bg-black/75 px-1.5 py-0.5 sm:px-2 font-mono text-[10px] sm:text-[11px] font-medium text-zinc-200 backdrop-blur-md border border-white/10">
          {trackIndexLabel}
        </div>

        {/* In-App Play / Preview Control */}
        {canPlayInApp && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={
              isPlaying
                ? `Pause preview for ${song.name}`
                : `Play ${song.name}`
            }
            className={cn(
              "absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border transition-all duration-200",
              isPlaying
                ? "border-primary bg-primary text-primary-foreground scale-100 opacity-100 shadow-md"
                : "border-white/15 bg-black/75 text-white backdrop-blur-md opacity-95 group-hover:opacity-100 hover:scale-105 hover:bg-primary hover:border-primary"
            )}
          >
            {isPlaying ? (
              <Pause size={14} className="fill-current sm:h-4 sm:w-4" />
            ) : (
              <Play size={14} className="fill-current ml-0.5 sm:h-4 sm:w-4" />
            )}
          </button>
        )}

        {/* Audio Progress Bar */}
        {song.previewUrl && (isPlaying || progress > 0) && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
            <div
              className="h-full bg-primary transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Track Metadata & Direct Platform Links */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-3.5 sm:p-4">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h3
              className="text-sm font-semibold text-zinc-100 truncate"
              title={song.name}
            >
              {song.name}
            </h3>
            {song.releaseYear && (
              <span className="shrink-0 font-mono text-[10px] sm:text-[11px] text-zinc-500">
                {song.releaseYear}
              </span>
            )}
          </div>

          <p
            className="mt-0.5 text-xs font-medium text-zinc-400 truncate"
            title={song.artist}
          >
            {song.artist}
          </p>

          {song.album && (
            <p
              className="mt-0.5 text-[11px] text-zinc-500 truncate"
              title={song.album}
            >
              {song.album}
            </p>
          )}

          {song.note && (
            <p className="mt-2 hidden sm:line-clamp-2 text-xs leading-relaxed text-zinc-400/90 border-t border-white/[0.06] pt-2">
              {song.note}
            </p>
          )}
        </div>

        {/* Direct Exact Track Links */}
        <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-1.5 pt-1">
          {song.spotifyUrl && (
            <Link
              href={song.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-zinc-100 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-950 transition-colors hover:bg-white"
              title={`Open "${song.name}" on Spotify`}
            >
              Spotify
              <ExternalLink size={10} className="opacity-70" />
            </Link>
          )}

          {song.youtubeMusicUrl && (
            <Link
              href={song.youtubeMusicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                !song.spotifyUrl
                  ? "flex-1 bg-zinc-100 font-semibold text-zinc-950 hover:bg-white"
                  : "border border-white/[0.1] bg-zinc-950/70 text-zinc-200 hover:border-white/25 hover:text-white"
              )}
              title={`Open "${song.name}" on YouTube Music`}
            >
              YT Music
            </Link>
          )}

          {song.jioSaavnUrl && (
            <Link
              href={song.jioSaavnUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 rounded-md border border-white/[0.1] bg-zinc-950/70 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
              title={`Open "${song.name}" on JioSaavn`}
            >
              JioSaavn
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

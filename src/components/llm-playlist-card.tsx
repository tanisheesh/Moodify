"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, ListMusic, Play, ChevronUp } from "lucide-react";
import type { Playlist } from "@/types/music";

interface LlmPlaylistCardProps {
  playlist: Playlist;
  index?: number;
}

export function LlmPlaylistCard({ playlist, index = 0 }: LlmPlaylistCardProps) {
  const [imgError, setImgError] = useState(false);
  const [showSpotifyEmbed, setShowSpotifyEmbed] = useState(false);

  useEffect(() => {
    setImgError(false);
    setShowSpotifyEmbed(false);
  }, [playlist.artworkUrl, playlist.spotifyPlaylistId]);

  const directionLabel = `PLAYLIST ${String(index + 1).padStart(2, "0")}`;
  const showArtwork = Boolean(playlist.artworkUrl) && !imgError;

  return (
    <article className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-zinc-900/45 p-4 sm:p-5 transition-colors hover:border-white/[0.16] hover:bg-zinc-900/70">
      <div>
        <div className="flex items-start gap-3.5 sm:gap-4">
          {showArtwork ? (
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
              <Image
                src={playlist.artworkUrl!}
                alt={playlist.name}
                width={160}
                height={160}
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-zinc-950 text-zinc-500">
              <ListMusic size={24} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-primary">
                {directionLabel}
              </span>
              {playlist.spotifyPlaylistId && (
                <button
                  type="button"
                  onClick={() => setShowSpotifyEmbed((prev) => !prev)}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  {showSpotifyEmbed ? (
                    <>
                      Hide Player <ChevronUp size={12} />
                    </>
                  ) : (
                    <>
                      <Play size={11} className="fill-current text-primary" />{" "}
                      Preview Here
                    </>
                  )}
                </button>
              )}
            </div>

            <h3
              className="text-sm sm:text-base font-semibold text-zinc-100 leading-snug truncate"
              title={playlist.name}
            >
              {playlist.name}
            </h3>

            <p className="mt-1 text-xs sm:text-sm leading-relaxed text-zinc-400 line-clamp-2">
              {playlist.description}
            </p>
          </div>
        </div>

        {/* Optional In-Card Spotify Playlist Embed */}
        {showSpotifyEmbed && playlist.spotifyPlaylistId && (
          <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
            <iframe
              title={`Spotify playlist: ${playlist.name}`}
              src={`https://open.spotify.com/embed/playlist/${playlist.spotifyPlaylistId}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="border-0"
            />
          </div>
        )}
      </div>

      <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3.5">
        {playlist.spotifyUrl && (
          <Link
            href={playlist.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-white"
          >
            Spotify Playlist
            <ExternalLink size={12} className="opacity-70" />
          </Link>
        )}

        {playlist.youtubeMusicUrl && (
          <Link
            href={playlist.youtubeMusicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.1] bg-zinc-950/80 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-white/25 hover:text-white"
          >
            YT Music Playlist
            <ExternalLink size={12} className="opacity-70" />
          </Link>
        )}

        {playlist.jioSaavnUrl && (
          <Link
            href={playlist.jioSaavnUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.1] bg-zinc-950/80 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-white/25 hover:text-white"
          >
            JioSaavn Playlist
            <ExternalLink size={12} className="opacity-70" />
          </Link>
        )}
      </div>
    </article>
  );
}

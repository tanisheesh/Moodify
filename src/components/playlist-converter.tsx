"use client";

import React, {
  useState,
  useTransition,
  useActionState,
  useEffect,
  useRef,
  FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  Disc3,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Link2,
  X,
} from "lucide-react";
import { convertPlaylistAction } from "@/app/converter-actions";
import type {
  ConvertedTrack,
  ConverterActionResponse,
} from "@/types/music";
import { SaveToSpotifyButton } from "@/components/save-to-spotify-button";
import { LoadingAnimation } from "@/components/loading-animation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  cn,
  AUDIO_SYNC_EVENT,
  broadcastAudioPlay,
  formatDuration,
} from "@/lib/utils";

const initialConverterState: ConverterActionResponse = {
  success: false,
  message: undefined,
  data: undefined,
};

const QUEUE_PLAYER_ID = "jiosaavn-hd-queue";

const SAMPLE_PLAYLISTS = [
  {
    label: "Spotify · Synthwave",
    url: "https://open.spotify.com/playlist/2gjWL0J5SQKceERGJ8Lb5e",
  },
  {
    label: "YouTube Music · Global Top",
    url: "https://music.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI",
  },
  {
    label: "JioSaavn · Chill Lo-Fi Mix",
    url: "https://www.jiosaavn.com/featured/chill-maaro-lo-fi-mix/mAA3xzx2Asqm0KYf4sgO,Q__",
  },
  {
    label: "Apple Music · Today's Hits",
    url: "https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb",
  },
] as const;

interface PlaylistConverterProps {
  onOpenSpotifyDock?: (trackId: string, label: string) => void;
}

export function PlaylistConverter({
  onOpenSpotifyDock,
}: PlaylistConverterProps) {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [state, formAction] = useActionState(
    convertPlaylistAction,
    initialConverterState
  );
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // In-App JioSaavn / Audio Full Playlist Queue Player State
  const [queueActive, setQueueActive] = useState(false);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [isQueuePlaying, setIsQueuePlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const conversion = state.success ? state.data : undefined;

  const playableQueueTracks = React.useMemo(() => {
    if (!conversion) return [];
    return conversion.tracks.filter((t) =>
      Boolean(t.fullAudioUrl || t.previewUrl)
    );
  }, [conversion]);

  const currentTrack: ConvertedTrack | undefined =
    playableQueueTracks[currentQueueIndex];

  useEffect(() => {
    if (state.message && !state.success) {
      toast({
        title: "Conversion Error",
        description: state.message,
        variant: "destructive",
      });
    }
  }, [state.message, state.success, state.timestamp, toast]);

  // Pause queue player if another audio source starts playing, and clean up on unmount
  useEffect(() => {
    const handleOtherAudio = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id !== QUEUE_PLAYER_ID && audioRef.current) {
        audioRef.current.pause();
        setIsQueuePlaying(false);
      }
    };

    window.addEventListener(AUDIO_SYNC_EVENT, handleOtherAudio);
    return () => {
      window.removeEventListener(AUDIO_SYNC_EVENT, handleOtherAudio);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Reset queue player when a new playlist is converted
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setQueueActive(false);
    setIsQueuePlaying(false);
    setCurrentQueueIndex(0);
    setCurrentTime(0);
    setDuration(0);
  }, [state.timestamp]);

  // Load and play track when currentQueueIndex or queueActive changes
  useEffect(() => {
    if (!queueActive || !currentTrack) return;
    const streamUrl = currentTrack.fullAudioUrl || currentTrack.previewUrl;
    if (!streamUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    audio.src = streamUrl;
    audio.volume = 0.9;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      if (currentQueueIndex + 1 < playableQueueTracks.length) {
        setCurrentQueueIndex((i) => i + 1);
      } else {
        setIsQueuePlaying(false);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    broadcastAudioPlay(QUEUE_PLAYER_ID);
    audio
      .play()
      .then(() => setIsQueuePlaying(true))
      .catch(() => setIsQueuePlaying(false));

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [
    queueActive,
    currentQueueIndex,
    currentTrack,
    playableQueueTracks.length,
  ]);

  const toggleQueuePlayPause = () => {
    if (!audioRef.current) return;
    if (isQueuePlaying) {
      audioRef.current.pause();
      setIsQueuePlaying(false);
    } else {
      broadcastAudioPlay(QUEUE_PLAYER_ID);
      audioRef.current
        .play()
        .then(() => setIsQueuePlaying(true))
        .catch(() => setIsQueuePlaying(false));
    }
  };

  const startQueueAtTrack = (track: ConvertedTrack) => {
    const idx = playableQueueTracks.findIndex(
      (t) => t.name === track.name && t.artist === track.artist
    );
    if (idx !== -1) {
      if (queueActive && currentQueueIndex === idx) {
        toggleQueuePlayPause();
      } else {
        setCurrentQueueIndex(idx);
        setQueueActive(true);
      }
    } else if (track.spotifyTrackId && onOpenSpotifyDock) {
      broadcastAudioPlay("spotify-dock");
      onOpenSpotifyDock(
        track.spotifyTrackId,
        `${track.name} — ${track.artist}`
      );
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("playlistUrl", playlistUrl);
    startTransition(() => {
      formAction(formData);
    });
  };

  const handleCopyTracklist = () => {
    if (!conversion) return;
    const text = conversion.tracks
      .map(
        (t, idx) =>
          `${String(idx + 1).padStart(2, "0")}. ${t.name} — ${t.artist}`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Tracklist Copied",
      description: `${conversion.tracks.length} tracks copied to clipboard`,
    });
  };

  const ytMatchedCount = conversion
    ? conversion.tracks.filter((t) => Boolean(t.youtubeVideoId)).length
    : 0;
  const saavnMatchedCount = conversion
    ? conversion.tracks.filter((t) => Boolean(t.jioSaavnUrl)).length
    : 0;

  return (
    <div className="w-full space-y-6 sm:space-y-8 fade-in">
      {/* Input Panel */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-white/[0.08] bg-zinc-900/50 p-4 sm:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
      >
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
              Cross-Platform Bridge
            </span>
            <h2 className="mt-1 text-base sm:text-lg font-semibold text-zinc-100">
              Import &amp; Convert Playlist
            </h2>
          </div>
          <span className="font-mono text-[11px] sm:text-xs text-zinc-500">
            Supports Spotify · YouTube Music · JioSaavn · Apple Music
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Link2
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <Input
              type="url"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="Paste public playlist link (Spotify, YouTube Music, JioSaavn, or Apple Music)..."
              required
              className="h-11 border-white/[0.1] bg-zinc-950/90 pl-10 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:border-primary/60 focus-visible:ring-1 focus-visible:ring-primary/40"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="h-11 w-full sm:w-auto min-w-[180px] rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {isPending ? (
              <LoadingAnimation text="Matching tracks..." size="sm" />
            ) : (
              <span className="inline-flex items-center gap-2">
                Convert Playlist
                <ArrowRight size={16} />
              </span>
            )}
          </Button>
        </div>

        {/* Sample 1-Click Playlist Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[11px] text-zinc-500">
            Test with sample:
          </span>
          {SAMPLE_PLAYLISTS.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => setPlaylistUrl(sample.url)}
              className="rounded-md border border-white/[0.06] bg-zinc-950/60 px-2.5 py-1 text-[11px] sm:text-xs text-zinc-400 transition-colors hover:border-white/20 hover:bg-zinc-900 hover:text-zinc-200"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </form>

      {/* Conversion Result */}
      {conversion && (
        <div className="space-y-5 sm:space-y-6 fade-in">
          {/* Converted Playlist Summary & Destination Export Bar */}
          <div className="flex flex-col justify-between gap-5 rounded-xl border border-white/[0.08] bg-zinc-900/45 p-4 sm:p-6">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                {conversion.source.coverUrl ? (
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                    <Image
                      src={conversion.source.coverUrl}
                      alt={conversion.source.title}
                      width={160}
                      height={160}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-950 text-zinc-500">
                    <Disc3 size={28} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-primary/15 border border-primary/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                      Source: {conversion.source.platform}
                    </span>
                    <span className="font-mono text-[11px] sm:text-xs text-zinc-400">
                      {conversion.source.convertedCount} tracks matched
                      {conversion.source.totalFound >
                        conversion.source.convertedCount &&
                        ` (of ${conversion.source.totalFound})`}
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-lg sm:text-xl font-bold text-zinc-100 truncate">
                    {conversion.source.title}
                  </h3>

                  <Link
                    href={conversion.source.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    View original {conversion.source.platform} playlist{" "}
                    <ExternalLink size={11} />
                  </Link>
                </div>
              </div>

              {/* Destination Playlist Makers */}
              <div className="flex flex-wrap items-center gap-2">
                {conversion.source.platform !== "spotify" && (
                  <SaveToSpotifyButton
                    playlistName={conversion.source.title}
                    description={`Converted from ${conversion.source.platform} via Moodify`}
                    spotifyTrackUris={conversion.spotifyTrackUris}
                  />
                )}

                {conversion.source.platform !== "youtube" &&
                  (conversion.youtubeMusicPlaylistUrl ||
                    conversion.youtubePlaylistUrl) && (
                    <Link
                      href={
                        conversion.youtubeMusicPlaylistUrl ??
                        conversion.youtubePlaylistUrl!
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3.5 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-white"
                    >
                      Open YT Music Playlist ({ytMatchedCount})
                      <ExternalLink size={12} />
                    </Link>
                  )}

                {playableQueueTracks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!queueActive) {
                        setCurrentQueueIndex(0);
                        setQueueActive(true);
                      } else {
                        toggleQueuePlayPause();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                  >
                    {queueActive && isQueuePlaying ? (
                      <>
                        <Pause size={13} className="fill-current" />
                        Pause JioSaavn Queue
                      </>
                    ) : (
                      <>
                        <Play size={13} className="fill-current" />
                        Play JioSaavn Playlist (
                        {saavnMatchedCount || playableQueueTracks.length})
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyTracklist}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.1] bg-zinc-950/80 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy List"}
                </button>
              </div>
            </div>

            {/* Active In-App JioSaavn Full-Song Playlist Player Bar */}
            {queueActive && currentTrack && (
              <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/30 bg-zinc-950/90 p-3.5 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {currentTrack.artworkUrl ? (
                    <Image
                      src={currentTrack.artworkUrl}
                      alt={currentTrack.name}
                      width={48}
                      height={48}
                      unoptimized
                      className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-md object-cover border border-white/10"
                    />
                  ) : (
                    <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-md bg-zinc-900">
                      <Disc3
                        size={20}
                        className="text-emerald-400 animate-spin"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                        JioSaavn HD Queue · {currentQueueIndex + 1}/
                        {playableQueueTracks.length}
                      </span>
                    </div>
                    <p className="truncate text-sm font-semibold text-zinc-100">
                      {currentTrack.name}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {currentTrack.artist}
                    </p>
                  </div>
                </div>

                <div className="flex flex-1 flex-col items-center gap-1.5 sm:max-w-md">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentQueueIndex((i) => Math.max(0, i - 1))
                      }
                      disabled={currentQueueIndex === 0}
                      className="text-zinc-400 hover:text-white disabled:opacity-30"
                      aria-label="Previous track"
                    >
                      <SkipBack size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={toggleQueuePlayPause}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                      aria-label={isQueuePlaying ? "Pause" : "Play"}
                    >
                      {isQueuePlaying ? (
                        <Pause size={15} className="fill-current" />
                      ) : (
                        <Play size={15} className="fill-current ml-0.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentQueueIndex((i) =>
                          Math.min(playableQueueTracks.length - 1, i + 1)
                        )
                      }
                      disabled={
                        currentQueueIndex >= playableQueueTracks.length - 1
                      }
                      className="text-zinc-400 hover:text-white disabled:opacity-30"
                      aria-label="Next track"
                    >
                      <SkipForward size={16} />
                    </button>
                  </div>

                  <div className="flex w-full items-center gap-2 font-mono text-[10px] text-zinc-500">
                    <span>{formatDuration(currentTime)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (audioRef.current) {
                          audioRef.current.currentTime = val;
                          setCurrentTime(val);
                        }
                      }}
                      className="h-1 flex-1 accent-emerald-400 cursor-pointer"
                    />
                    <span>{formatDuration(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  {currentTrack.jioSaavnUrl && (
                    <Link
                      href={currentTrack.jioSaavnUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:text-white"
                    >
                      Open in JioSaavn
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (audioRef.current) audioRef.current.pause();
                      setQueueActive(false);
                      setIsQueuePlaying(false);
                    }}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                    aria-label="Close queue player"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tracklist Table */}
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-900/35">
            <div className="divide-y divide-white/[0.06]">
              {conversion.tracks.map((track, idx) => {
                const isThisTrackPlaying =
                  queueActive &&
                  isQueuePlaying &&
                  currentTrack?.name === track.name &&
                  currentTrack?.artist === track.artist;

                return (
                  <div
                    key={`${track.name}-${track.artist}-${idx}`}
                    className={cn(
                      "flex flex-col justify-between gap-2.5 px-3.5 py-3 sm:px-4 transition-colors sm:flex-row sm:items-center",
                      isThisTrackPlaying
                        ? "bg-emerald-500/[0.07]"
                        : "hover:bg-zinc-900/70"
                    )}
                  >
                    <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                      <span className="w-5 sm:w-6 shrink-0 font-mono text-[11px] sm:text-xs text-zinc-500">
                        {String(idx + 1).padStart(2, "0")}
                      </span>

                      <div className="relative h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-950">
                        {track.artworkUrl ? (
                          <Image
                            src={track.artworkUrl}
                            alt={track.name}
                            width={88}
                            height={88}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-600">
                            <Disc3 size={18} />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => startQueueAtTrack(track)}
                          aria-label={`Play ${track.name}`}
                          className={cn(
                            "absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity text-white",
                            isThisTrackPlaying
                              ? "opacity-100 text-emerald-400"
                              : "opacity-0 hover:opacity-100"
                          )}
                        >
                          {isThisTrackPlaying ? (
                            <Pause size={14} className="fill-current" />
                          ) : (
                            <Play size={14} className="fill-current" />
                          )}
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">
                          {track.name}
                        </p>
                        <p className="truncate text-xs text-zinc-400">
                          {track.artist}
                          {track.album ? ` · ${track.album}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Direct Exact Links per Track */}
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 pl-8 sm:pl-0">
                      {track.spotifyUrl && (
                        <Link
                          href={track.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border border-white/[0.1] bg-zinc-950 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/30 hover:text-white"
                        >
                          Spotify
                        </Link>
                      )}

                      {track.youtubeMusicUrl && (
                        <Link
                          href={track.youtubeMusicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border border-white/[0.1] bg-zinc-950 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/30 hover:text-white"
                        >
                          YT Music
                        </Link>
                      )}

                      {track.jioSaavnUrl && (
                        <Link
                          href={track.jioSaavnUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border border-white/[0.1] bg-zinc-950 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-white/30 hover:text-white"
                        >
                          JioSaavn
                        </Link>
                      )}

                      {track.appleMusicUrl && (
                        <Link
                          href={track.appleMusicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border border-white/[0.08] bg-transparent px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:border-white/25 hover:text-zinc-200"
                        >
                          Apple
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

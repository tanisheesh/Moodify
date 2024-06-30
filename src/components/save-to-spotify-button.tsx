"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2, ListPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SaveToSpotifyButtonProps {
  playlistName: string;
  description?: string;
  spotifyTrackUris: string[];
  className?: string;
}

export function SaveToSpotifyButton({
  playlistName,
  description,
  spotifyTrackUris,
  className,
}: SaveToSpotifyButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const createPlaylistRequest = useCallback(async () => {
    const res = await fetch("/api/spotify/create-playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: playlistName,
        description,
        uris: spotifyTrackUris,
      }),
    });
    const data = await res.json();
    return { status: res.status, data };
  }, [playlistName, description, spotifyTrackUris]);

  const handleSave = async () => {
    if (spotifyTrackUris.length === 0) {
      toast({
        title: "No Spotify tracks available",
        description: "None of the tracks could be matched on Spotify.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const initial = await createPlaylistRequest();

      if (initial.status === 200 && initial.data?.playlistUrl) {
        setCreatedUrl(initial.data.playlistUrl);
        toast({
          title: "Saved to your Spotify",
          description: `Created "${playlistName}" with ${spotifyTrackUris.length} tracks.`,
        });
        setIsSaving(false);
        return;
      }

      if (initial.status === 401) {
        // Open Spotify OAuth popup
        const width = 520;
        const height = 680;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          "/api/spotify/login",
          "MoodifySpotifyAuth",
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          toast({
            title: "Popup blocked",
            description: "Please allow popups for this site to connect Spotify.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }

        const handleMessage = async (event: MessageEvent) => {
          if (event.data?.type === "SPOTIFY_AUTH_SUCCESS") {
            window.removeEventListener("message", handleMessage);
            const retry = await createPlaylistRequest();
            if (retry.status === 200 && retry.data?.playlistUrl) {
              setCreatedUrl(retry.data.playlistUrl);
              toast({
                title: "Saved to your Spotify",
                description: `Created "${playlistName}" with ${spotifyTrackUris.length} tracks.`,
              });
            } else {
              toast({
                title: "Export failed",
                description: retry.data?.message || "Could not create Spotify playlist.",
                variant: "destructive",
              });
            }
            setIsSaving(false);
          } else if (event.data?.type === "SPOTIFY_AUTH_ERROR") {
            window.removeEventListener("message", handleMessage);
            toast({
              title: "Spotify authorization failed",
              description: event.data?.error || "Could not connect to Spotify.",
              variant: "destructive",
            });
            setIsSaving(false);
          }
        };

        window.addEventListener("message", handleMessage);
        return;
      }

      toast({
        title: "Could not save playlist",
        description: initial.data?.message || "Unexpected error while saving to Spotify.",
        variant: "destructive",
      });
    } catch (err) {
      toast({
        title: "Network error",
        description: err instanceof Error ? err.message : "Failed to reach server.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (createdUrl) {
    return (
      <Link
        href={createdUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25",
          className
        )}
      >
        <Check size={13} />
        Open Created Spotify Playlist
        <ExternalLink size={12} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={isSaving || spotifyTrackUris.length === 0}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-white disabled:opacity-50",
        className
      )}
    >
      {isSaving ? (
        <>
          <Loader2 size={13} className="animate-spin" />
          Saving to Spotify...
        </>
      ) : (
        <>
          <ListPlus size={14} />
          Save to My Spotify ({spotifyTrackUris.length})
        </>
      )}
    </button>
  );
}

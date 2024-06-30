"use client";

import {
  useState,
  useTransition,
  useRef,
  useCallback,
  FormEvent,
  useActionState,
  useEffect,
} from "react";
import type { ActionResponse } from "./actions";
import { fetchRecommendations } from "./actions";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GenreSelector } from "@/components/genre-selector";
import { LlmRecommendationCard } from "@/components/llm-recommendation-card";
import { LlmPlaylistCard } from "@/components/llm-playlist-card";
import { PlaylistConverter } from "@/components/playlist-converter";
import { SaveToSpotifyButton } from "@/components/save-to-spotify-button";
import { Footer } from "@/components/footer";
import { SplashScreen } from "@/components/splash-screen";
import { LoadingAnimation } from "@/components/loading-animation";
import {
  AlertCircle,
  ArrowRight,
  Volume2,
  ExternalLink,
  X,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const initialState: ActionResponse = {
  success: false,
  message: undefined,
  data: undefined,
  errors: undefined,
};

const QUICK_SCENARIOS = [
  {
    label: "Late night focus",
    mood: "Deep into a late-night work session at 2 AM, quiet room, need steady atmospheric momentum without lyrical distraction.",
    genres: ["ambient", "electronic", "chill", "synth-pop"],
  },
  {
    label: "Highway night drive",
    mood: "Cruising on an empty highway after midnight with city lights passing by, reflective and cinematic.",
    genres: ["synth-pop", "indie", "alt-rock", "electronic"],
  },
  {
    label: "Rainy afternoon",
    mood: "Watching rain outside the window with warm coffee, unhurried, nostalgic, and calm.",
    genres: ["acoustic", "indie-pop", "folk", "chill"],
  },
  {
    label: "Heavy training",
    mood: "High-intensity gym session, locked in, looking for aggressive drums and relentless tempo.",
    genres: ["hip-hop", "rock", "electronic", "work-out"],
  },
  {
    label: "Sunday morning",
    mood: "Slow Sunday morning with sunlight coming in, easygoing, warm, and soulful.",
    genres: ["soul", "jazz", "r-n-b", "acoustic"],
  },
] as const;

const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Punjabi",
  "Spanish",
  "Japanese",
  "Korean",
  "Instrumental",
] as const;

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<"curate" | "converter">("curate");
  const [moodText, setMoodText] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [customLanguage, setCustomLanguage] = useState<string>("");
  const [isCustomLanguage, setIsCustomLanguage] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const [formState, formAction] = useActionState(
    fetchRecommendations,
    initialState
  );
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [typedAnalysis, setTypedAnalysis] = useState("");
  const [activeSpotifyDock, setActiveSpotifyDock] = useState<{
    trackId: string;
    label: string;
  } | null>(null);

  const { toast } = useToast();

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleGenreChange = useCallback((genre: string, checked: boolean) => {
    setSelectedGenres((prev) =>
      checked ? [...prev, genre] : prev.filter((g) => g !== genre)
    );
  }, []);

  const handleClearGenres = useCallback(() => {
    setSelectedGenres([]);
  }, []);

  const handleApplyScenario = (scenario: (typeof QUICK_SCENARIOS)[number]) => {
    setMoodText(scenario.mood);
    setSelectedGenres([...scenario.genres]);
  };

  useEffect(() => {
    if (formState.success && formState.data?.analysis) {
      const fullText = formState.data.analysis;
      let currentIndex = 0;
      setTypedAnalysis("");

      const intervalId = setInterval(() => {
        currentIndex += 2;
        if (currentIndex <= fullText.length) {
          setTypedAnalysis(fullText.slice(0, currentIndex));
        } else {
          setTypedAnalysis(fullText);
          clearInterval(intervalId);
        }
      }, 18);

      return () => clearInterval(intervalId);
    }
  }, [formState.success, formState.data?.analysis, formState.timestamp]);

  useEffect(() => {
    if (formState.success && formState.data && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [formState.success, formState.data, formState.timestamp]);

  useEffect(() => {
    if (formState.errors && formState.errors.length > 0) {
      formState.errors.forEach((error) => {
        toast({
          title: "Missing input",
          description: error.message,
          variant: "destructive",
        });
      });
    }
    if (formState.message && !formState.success) {
      toast({
        title: "Could not curate tracks",
        description: formState.message,
        variant: "destructive",
      });
    }
  }, [
    formState.errors,
    formState.message,
    formState.success,
    formState.timestamp,
    toast,
  ]);

  const effectiveLanguage = isCustomLanguage
    ? customLanguage.trim()
    : selectedLanguage;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.set("mood", moodText);
    formData.set("language", effectiveLanguage);
    selectedGenres.forEach((genre) => formData.append("genres", genre));

    startTransition(() => {
      formAction(formData);
    });
  };

  const { songs, playlists, analysis, youtubeQueueUrl } =
    formState.success && formState.data
      ? formState.data
      : {
          songs: [],
          playlists: [],
          analysis: undefined,
          youtubeQueueUrl: undefined,
        };

  const hasAudioPreviews = songs.some(
    (s) => Boolean(s.previewUrl || s.spotifyTrackId)
  );
  const moodSpotifyUris = songs
    .map((s) => (s.spotifyTrackId ? `spotify:track:${s.spotifyTrackId}` : null))
    .filter((u): u is string => Boolean(u));

  if (showSplash) {
    return <SplashScreen onFinished={handleSplashFinish} />;
  }

  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col items-center bg-[#09090b] text-zinc-100 selection:bg-primary/30",
        activeSpotifyDock && "pb-28"
      )}
    >
      {/* Subtle top studio light */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(ellipse_60%_50%_at_50%_-15%,rgba(225,29,72,0.12),transparent)]"
        aria-hidden="true"
      />

      {/* Sticky Top Product Navbar */}
      <nav className="sticky top-0 z-30 w-full border-b border-white/[0.06] bg-[#09090b]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-zinc-900">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 14V10M8 17V7M12 19V5M16 17V7M20 14V10"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  className="text-primary"
                />
              </svg>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold tracking-tight text-zinc-100">
                <span className="text-primary">M</span>OODIFY
              </span>
              <span className="hidden sm:inline-block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Studio
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-zinc-500">
            <span>Spotify</span>
            <span className="text-zinc-700">·</span>
            <span>YouTube Music</span>
            <span className="text-zinc-700">·</span>
            <span>JioSaavn</span>
            <span className="text-zinc-700">·</span>
            <span>Apple Music</span>
          </div>

          <div className="inline-flex rounded-lg border border-white/[0.08] bg-zinc-900/90 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("curate")}
              className={cn(
                "rounded-md px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-medium transition-all",
                activeTab === "curate"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              Mood Curation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("converter")}
              className={cn(
                "rounded-md px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-medium transition-all",
                activeTab === "converter"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              Playlist Exporter
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex w-full max-w-6xl flex-1 flex-col px-4 pt-6 pb-10 sm:px-6 sm:pt-10 md:px-10">
        {/* Product Hero Header */}
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-white/[0.07] pb-6 sm:mb-10 sm:pb-8 md:flex-row md:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {activeTab === "curate"
                ? "01 / Mood-to-Track Engine"
                : "02 / 4-Platform Playlist Bridge"}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
              {activeTab === "curate"
                ? "Soundtracks built from how you feel."
                : "Move playlists across any streaming platform."}
            </h1>
          </div>

          <p className="max-w-md text-xs sm:text-sm leading-relaxed text-zinc-400 md:text-right">
            {activeTab === "curate"
              ? "Describe your current state and pick your sonic palette. Get five tracks with exact links and live audio previews."
              : "Paste any public playlist from Spotify, YouTube Music, JioSaavn, or Apple Music to match and export in one click."}
          </p>
        </header>

        {activeTab === "converter" ? (
          <PlaylistConverter
            onOpenSpotifyDock={(trackId, label) =>
              setActiveSpotifyDock({ trackId, label })
            }
          />
        ) : (
          <>
            {/* Studio Input Form */}
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="w-full space-y-5 sm:space-y-6"
            >
              <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12">
                {/* Left Column: Mood & Language (7 cols) */}
                <div className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-zinc-900/50 p-4 sm:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] lg:col-span-7">
                  <div className="space-y-5">
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                        01 / Current State
                      </span>
                      <h2 className="mt-1 text-base sm:text-lg font-semibold text-zinc-100">
                        How does right now feel?
                      </h2>
                    </div>

                    {/* Mood Textarea */}
                    <div>
                      <Textarea
                        name="mood"
                        value={moodText}
                        onChange={(e) => setMoodText(e.target.value)}
                        placeholder="Describe the atmosphere, time of day, or mood (e.g., Winding down after a long day, rain outside, want warm acoustic and slow synth textures)..."
                        className="min-h-[112px] sm:min-h-[128px] resize-none rounded-lg border-white/[0.08] bg-zinc-950/80 p-3 sm:p-3.5 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus-visible:border-primary/60 focus-visible:ring-1 focus-visible:ring-primary/40"
                        required
                        aria-label="Describe your mood"
                      />

                      {/* Quick Scenarios */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 font-mono text-[11px] text-zinc-500">
                          Try:
                        </span>
                        {QUICK_SCENARIOS.map((scenario) => (
                          <button
                            key={scenario.label}
                            type="button"
                            onClick={() => handleApplyScenario(scenario)}
                            className="rounded-md border border-white/[0.06] bg-zinc-950/60 px-2.5 py-1 text-[11px] sm:text-xs text-zinc-400 transition-colors hover:border-white/20 hover:bg-zinc-900 hover:text-zinc-200"
                          >
                            {scenario.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Language Selection */}
                    <div className="pt-3 border-t border-white/[0.06]">
                      <div className="mb-2.5 flex items-center justify-between">
                        <label
                          htmlFor="language-custom"
                          className="text-xs font-medium uppercase tracking-wider text-zinc-400 font-mono"
                        >
                          Preferred Language
                        </label>
                        <span className="font-mono text-[11px] text-zinc-500">
                          {effectiveLanguage || "None"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {LANGUAGE_OPTIONS.map((lang) => {
                          const active =
                            !isCustomLanguage && selectedLanguage === lang;
                          return (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => {
                                setIsCustomLanguage(false);
                                setSelectedLanguage(lang);
                              }}
                              className={cn(
                                "rounded-md border px-2.5 py-1.5 sm:px-3 text-xs font-medium transition-colors",
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-white/[0.07] bg-zinc-950/60 text-zinc-300 hover:border-white/20 hover:text-zinc-100"
                              )}
                            >
                              {lang}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setIsCustomLanguage(true)}
                          className={cn(
                            "rounded-md border px-2.5 py-1.5 sm:px-3 text-xs font-medium transition-colors",
                            isCustomLanguage
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-white/[0.07] bg-zinc-950/60 text-zinc-400 hover:border-white/20 hover:text-zinc-100"
                          )}
                        >
                          Other...
                        </button>
                      </div>

                      {isCustomLanguage && (
                        <div className="mt-2.5">
                          <Input
                            id="language-custom"
                            value={customLanguage}
                            onChange={(e) => setCustomLanguage(e.target.value)}
                            placeholder="Enter language (e.g., Tamil, French, Bengali, Marathi)..."
                            className="h-9 border-white/[0.1] bg-zinc-950/90 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-primary/40"
                            required
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Genre Selector (5 cols) */}
                <div className="lg:col-span-5 flex">
                  <GenreSelector
                    selectedGenres={selectedGenres}
                    onGenreChange={handleGenreChange}
                    onClearGenres={handleClearGenres}
                  />
                </div>
              </div>

              {/* Submit Action Bar */}
              <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-white/[0.08] bg-zinc-900/35 p-4 sm:flex-row sm:items-center sm:px-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span className="font-mono uppercase text-zinc-300">
                    {effectiveLanguage || "Select Language"}
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span className="font-mono">
                    {selectedGenres.length === 0
                      ? "Select at least 1 genre"
                      : `${selectedGenres.length} ${
                          selectedGenres.length === 1 ? "genre" : "genres"
                        }: ${selectedGenres
                          .slice(0, 3)
                          .map((g) => g.replace(/-/g, " "))
                          .join(", ")}${
                          selectedGenres.length > 3
                            ? ` +${selectedGenres.length - 3}`
                            : ""
                        }`}
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-11 w-full sm:w-auto min-w-[190px] rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-60"
                  aria-live="polite"
                >
                  {isPending ? (
                    <LoadingAnimation text="Curating tracks..." size="sm" />
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Curate Soundtrack
                      <ArrowRight size={16} />
                    </span>
                  )}
                </Button>
              </div>
            </form>

            {/* Results Section */}
            {formState.success && formState.data && (
              <div
                ref={resultsRef}
                className="mt-10 sm:mt-14 w-full space-y-10 sm:space-y-12 border-t border-white/[0.08] pt-8 sm:pt-12 fade-in"
              >
                {/* Curator's Liner Notes */}
                {analysis && (
                  <section className="rounded-xl border border-white/[0.08] bg-zinc-900/40 p-4 sm:p-6">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-widest text-primary">
                        Curator&apos;s Note
                      </span>
                      {formState.data.queryContext && (
                        <span className="font-mono text-[11px] text-zinc-500">
                          {formState.data.queryContext.language} ·{" "}
                          {formState.data.queryContext.genres.length} genres
                        </span>
                      )}
                    </div>
                    <p className="text-sm md:text-base leading-relaxed text-zinc-200 max-w-4xl">
                      {typedAnalysis}
                    </p>
                  </section>
                )}

                {/* 5 Recommended Tracks */}
                <section>
                  <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                        Selected Tracks
                      </span>
                      <h2 className="mt-0.5 text-lg sm:text-xl font-semibold text-zinc-100">
                        Five Tracks for Right Now
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {hasAudioPreviews && (
                        <p className="inline-flex items-center gap-1.5 font-mono text-[11px] sm:text-xs text-zinc-400 mr-1">
                          <Volume2 size={14} className="text-primary" />
                          Click cover to preview
                        </p>
                      )}
                      {moodSpotifyUris.length > 0 && (
                        <SaveToSpotifyButton
                          playlistName={`Moodify · ${
                            formState.data.queryContext?.mood.slice(0, 32) ||
                            "Vibe"
                          }`}
                          description={analysis}
                          spotifyTrackUris={moodSpotifyUris}
                        />
                      )}
                      {youtubeQueueUrl && (
                        <Link
                          href={youtubeQueueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-primary hover:text-primary-foreground"
                        >
                          Open YT Music Playlist
                          <ExternalLink size={12} />
                        </Link>
                      )}
                    </div>
                  </div>

                  {songs.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
                      {songs.map((song, index) => (
                        <LlmRecommendationCard
                          key={`${song.name}-${song.artist}-${index}`}
                          song={song}
                          index={index}
                          onOpenSpotifyDock={(trackId, label) =>
                            setActiveSpotifyDock({ trackId, label })
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <Alert className="border-white/10 bg-zinc-900 text-zinc-200">
                      <AlertCircle className="h-4 w-4 text-primary" />
                      <AlertTitle>No Songs Found</AlertTitle>
                      <AlertDescription>
                        Could not find matching tracks for this combination. Try
                        adjusting your genres or mood description.
                      </AlertDescription>
                    </Alert>
                  )}
                </section>

                {/* 2 Playlist Directions */}
                <section>
                  <div className="mb-5">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                      Extended Listening
                    </span>
                    <h2 className="mt-0.5 text-lg sm:text-xl font-semibold text-zinc-100">
                      Playlist Directions
                    </h2>
                  </div>

                  {playlists.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
                      {playlists.map((playlist, index) => (
                        <LlmPlaylistCard
                          key={`${playlist.name}-${index}`}
                          playlist={playlist}
                          index={index}
                        />
                      ))}
                    </div>
                  ) : (
                    <Alert className="border-white/10 bg-zinc-900 text-zinc-200">
                      <AlertCircle className="h-4 w-4 text-primary" />
                      <AlertTitle>No Playlists Found</AlertTitle>
                      <AlertDescription>
                        No playlist themes were generated for this combination.
                      </AlertDescription>
                    </Alert>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Spotify Studio Dock Player */}
      {activeSpotifyDock && (
        <div className="fixed bottom-3 inset-x-3 sm:left-1/2 sm:right-auto z-40 sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 rounded-xl border border-white/15 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-lg">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-mono text-[11px] text-zinc-400 truncate pr-2">
              Now Playing · {activeSpotifyDock.label}
            </span>
            <button
              type="button"
              onClick={() => setActiveSpotifyDock(null)}
              aria-label="Close player"
              className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
          <iframe
            title={`Spotify player: ${activeSpotifyDock.label}`}
            src={`https://open.spotify.com/embed/track/${activeSpotifyDock.trackId}?utm_source=generator&theme=0`}
            width="100%"
            height="80"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-lg border-0"
          />
        </div>
      )}

      <Footer />
    </div>
  );
}

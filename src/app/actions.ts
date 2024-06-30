"use server";

import {
  generateMusicRecommendations,
  type GenerateMusicRecommendationsInput,
} from "@/ai/flows/interpret-mood";
import { generateYouTubePlaylistLinks } from "@/lib/music-platforms";
import { z } from "zod";

export interface Song {
  name: string;
  artist: string;
  note?: string;
  artworkUrl?: string;
  previewUrl?: string;
  album?: string;
  releaseYear?: string;
  youtubeVideoId?: string;
  youtubeMusicUrl?: string;
  youtubeUrl?: string;
  jioSaavnUrl?: string;
  spotifyTrackId?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
}

export interface Playlist {
  name: string;
  description: string;
  artworkUrl?: string;
  youtubePlaylistId?: string;
  youtubeMusicUrl?: string;
  jioSaavnUrl?: string;
  spotifyPlaylistId?: string;
  spotifyUrl?: string;
}

const RecommendationInputSchema = z.object({
  mood: z.string().trim().min(1, "Please describe how you're feeling."),
  language: z.string().trim().min(1, "Please select or enter a preferred language."),
  genres: z.array(z.string()).min(1, "Select at least one genre."),
});

export type RecommendationInput = z.infer<typeof RecommendationInputSchema>;

export interface RecommendationResult {
  songs: Song[];
  playlists: Playlist[];
  analysis?: string;
  youtubeQueueUrl?: string;
  queryContext?: {
    mood: string;
    language: string;
    genres: string[];
  };
}

export interface ActionResponse {
  success: boolean;
  message?: string;
  data?: RecommendationResult;
  errors?: z.ZodIssue[];
  timestamp?: number;
}

export async function fetchRecommendations(
  prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const rawFormData = {
    mood: formData.get("mood"),
    language: formData.get("language"),
    genres: formData
      .getAll("genres")
      .filter((g): g is string => typeof g === "string" && g.trim().length > 0),
  };

  const validatedRawData = {
    mood: typeof rawFormData.mood === "string" ? rawFormData.mood : "",
    language:
      typeof rawFormData.language === "string" && rawFormData.language.trim().length > 0
        ? rawFormData.language
        : "English",
    genres: Array.isArray(rawFormData.genres)
      ? rawFormData.genres.map((g) => String(g))
      : [],
  };

  const validationResult = RecommendationInputSchema.safeParse(validatedRawData);

  if (!validationResult.success) {
    return {
      success: false,
      errors: validationResult.error.issues,
      timestamp: Date.now(),
    };
  }

  const { mood, language, genres } = validationResult.data;

  try {
    const recommendationInput: GenerateMusicRecommendationsInput = {
      mood,
      language,
      genres,
    };

    const recommendationOutput = await generateMusicRecommendations(recommendationInput);

    if (
      !recommendationOutput ||
      !Array.isArray(recommendationOutput.songs) ||
      !Array.isArray(recommendationOutput.playlists)
    ) {
      return {
        success: false,
        message: "Could not curate tracks right now. Please try again.",
        timestamp: Date.now(),
      };
    }

    const videoIds = recommendationOutput.songs
      .map((s) => s.youtubeVideoId)
      .filter((id): id is string => Boolean(id));

    const ytLinks = await generateYouTubePlaylistLinks(videoIds);
    const youtubeQueueUrl =
      ytLinks.youtubeMusicPlaylistUrl ?? ytLinks.youtubePlaylistUrl;

    const resultData: RecommendationResult = {
      songs: recommendationOutput.songs,
      playlists: recommendationOutput.playlists,
      analysis: recommendationOutput.analysis,
      youtubeQueueUrl,
      queryContext: { mood, language, genres },
    };

    return {
      success: true,
      data: resultData,
      timestamp: Date.now(),
    };
  } catch (error) {
    let errorMessage = "Something went wrong while curating your tracks.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }
    return {
      success: false,
      message: errorMessage,
      timestamp: Date.now(),
    };
  }
}

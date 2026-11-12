"use server";

import {
  generateMusicRecommendations,
  type GenerateMusicRecommendationsInput,
} from "@/ai/flows/interpret-mood";
import { generateYouTubePlaylistLinks } from "@/lib/music-platforms";
import type {
  Song,
  Playlist,
  RecommendationResult,
  ActionResponse,
} from "@/types/music";
import { z } from "zod";

export type { Song, Playlist, RecommendationResult, ActionResponse };

const RecommendationInputSchema = z.object({
  mood: z.string().trim().min(1, "Please describe how you're feeling."),
  language: z
    .string()
    .trim()
    .min(1, "Please select or enter a preferred language."),
  genres: z.array(z.string()).min(1, "Select at least one genre."),
});

export type RecommendationInput = z.infer<typeof RecommendationInputSchema>;

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
      typeof rawFormData.language === "string" &&
      rawFormData.language.trim().length > 0
        ? rawFormData.language
        : "English",
    genres: Array.isArray(rawFormData.genres)
      ? rawFormData.genres.map((g) => String(g))
      : [],
  };

  const validationResult =
    RecommendationInputSchema.safeParse(validatedRawData);

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

    const recommendationOutput =
      await generateMusicRecommendations(recommendationInput);

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
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Something went wrong while curating your tracks.";
    return {
      success: false,
      message: errorMessage,
      timestamp: Date.now(),
    };
  }
}

"use server";

import { generateMusicRecommendations, type GenerateMusicRecommendationsInput, type GenerateMusicRecommendationsOutput } from "@/ai/flows/interpret-mood";
import { z } from 'zod';
import { revalidatePath } from "next/cache";

// Define local types for the data structure returned by the action
export interface Song {
    name: string;
    artist: string;
    // Removed youtubeMusicUrl - will be generated in the component
}

export interface Playlist {
    name: string;
    description: string;
    // Removed url and coverArtUrl, will generate search link in component
}


const RecommendationInputSchema = z.object({
  mood: z.string().min(1, "Mood description cannot be empty."),
  language: z.string().min(1, "Language cannot be empty."),
  genres: z.array(z.string()).min(1, "Please select at least one genre."),
});

export type RecommendationInput = z.infer<typeof RecommendationInputSchema>;

// Update RecommendationResult to match the new flow output
export interface RecommendationResult {
  songs: Song[];
  playlists: Playlist[];
  analysis?: string;
}

export interface ActionResponse {
    success: boolean;
    message?: string;
    data?: RecommendationResult;
    errors?: z.ZodIssue[];
}

const initialState: ActionResponse = {
  success: false,
  message: undefined,
  data: undefined,
  errors: undefined,
};


// Update function signature to accept prevState
export async function fetchRecommendations(
    prevState: ActionResponse,
    formData: FormData
): Promise<ActionResponse> {
  const rawFormData = {
    mood: formData.get('mood'),
    language: formData.get('language'),
    genres: formData.getAll('genres').filter(g => typeof g === 'string' && g.length > 0),
  };

  // Ensure values are strings or default to empty string if null/undefined
  const validatedRawData = {
      mood: typeof rawFormData.mood === 'string' ? rawFormData.mood : '',
      language: typeof rawFormData.language === 'string' ? rawFormData.language : '',
      genres: Array.isArray(rawFormData.genres) ? rawFormData.genres.map(g => String(g)) : [], // Ensure genres are strings
  };


  const validationResult = RecommendationInputSchema.safeParse(validatedRawData);

  if (!validationResult.success) {
    return { success: false, errors: validationResult.error.issues };
  }

  const { mood, language, genres } = validationResult.data;

  try {
    const recommendationInput: GenerateMusicRecommendationsInput = { mood, language, genres };

    const recommendationOutput = await generateMusicRecommendations(recommendationInput);

    if (!recommendationOutput || !Array.isArray(recommendationOutput.songs) || !Array.isArray(recommendationOutput.playlists)) {
       return { success: false, message: "Failed to get valid recommendations from the AI. Please try again." };
    }

    // Map the output to the expected structure for the frontend
    const resultData: RecommendationResult = {
        songs: recommendationOutput.songs.map(s => ({
            name: s.name,
            artist: s.artist,
            // youtubeMusicUrl is no longer mapped here
        })),
        playlists: recommendationOutput.playlists.map(p => ({
            name: p.name,
            description: p.description,
        })),
        analysis: recommendationOutput.analysis,
    };

    // Optional: Revalidate path if needed
    // revalidatePath('/');

    return {
        success: true,
        data: resultData,
    };

  } catch (error) {
    let errorMessage = "An unexpected error occurred while generating recommendations.";
    if (error instanceof Error) {
        const errorDetails = (error as any).details || (error as any).cause;
        errorMessage = errorDetails ? `${error.message} - Details: ${JSON.stringify(errorDetails)}` : error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    return { success: false, message: errorMessage };
  }
}

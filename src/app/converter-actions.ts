"use server";

import {
  convertPlaylistFromUrl,
  type PlaylistConversionResult,
} from "@/lib/playlist-converter";

export interface ConverterActionResponse {
  success: boolean;
  message?: string;
  data?: PlaylistConversionResult;
  timestamp?: number;
}

export async function convertPlaylistAction(
  prevState: ConverterActionResponse,
  formData: FormData
): Promise<ConverterActionResponse> {
  const rawUrl = formData.get("playlistUrl");
  const playlistUrl = typeof rawUrl === "string" ? rawUrl.trim() : "";

  if (!playlistUrl) {
    return {
      success: false,
      message: "Please paste a playlist URL from Spotify, YouTube, JioSaavn, or Apple Music.",
      timestamp: Date.now(),
    };
  }

  try {
    const result = await convertPlaylistFromUrl(playlistUrl);
    return {
      success: true,
      data: result,
      timestamp: Date.now(),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to convert playlist. Please check the URL and try again.";
    return {
      success: false,
      message: errorMessage,
      timestamp: Date.now(),
    };
  }
}

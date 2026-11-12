import type { z } from "zod";

export type SourcePlatform =
  | "spotify"
  | "youtube"
  | "jiosaavn"
  | "apple-music";

export interface EnrichedSongMetadata {
  artworkUrl?: string;
  previewUrl?: string;
  fullAudioUrl?: string;
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

export interface EnrichedPlaylistMetadata {
  artworkUrl?: string;
  youtubePlaylistId?: string;
  youtubeMusicUrl?: string;
  jioSaavnUrl?: string;
  spotifyPlaylistId?: string;
  spotifyUrl?: string;
}

export interface Song extends EnrichedSongMetadata {
  name: string;
  artist: string;
  note?: string;
}

export interface Playlist extends EnrichedPlaylistMetadata {
  name: string;
  description: string;
}

export interface GeneratedYouTubePlaylistLinks {
  playlistId?: string;
  youtubePlaylistUrl?: string;
  youtubeMusicPlaylistUrl?: string;
  youtubeQueueUrl?: string;
}

export interface RawPlaylistTrack {
  name: string;
  artist: string;
}

export interface ImportedPlaylistInfo {
  platform: SourcePlatform;
  title: string;
  description?: string;
  coverUrl?: string;
  sourceUrl: string;
  totalFound: number;
  tracks: RawPlaylistTrack[];
}

export interface ConvertedTrack extends RawPlaylistTrack, EnrichedSongMetadata {}

export interface PlaylistConversionResult {
  source: {
    platform: SourcePlatform;
    title: string;
    coverUrl?: string;
    sourceUrl: string;
    totalFound: number;
    convertedCount: number;
  };
  tracks: ConvertedTrack[];
  youtubePlaylistUrl?: string;
  youtubeMusicPlaylistUrl?: string;
  youtubeQueueUrl?: string;
  spotifyTrackUris: string[];
}

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
  errors?: z.core.$ZodIssue[];
  timestamp?: number;
}

export interface ConverterActionResponse {
  success: boolean;
  message?: string;
  data?: PlaylistConversionResult;
  timestamp?: number;
}

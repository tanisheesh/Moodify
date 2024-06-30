'use server';

import Groq from 'groq-sdk';
import { z } from 'zod';
import {
  enrichSongAcrossPlatforms,
  enrichPlaylistAcrossPlatforms,
} from '@/lib/music-platforms';

const GenerateMusicRecommendationsInputSchema = z.object({
  mood: z.string(),
  language: z.string(),
  genres: z.array(z.string()),
});
export type GenerateMusicRecommendationsInput = z.infer<
  typeof GenerateMusicRecommendationsInputSchema
>;

const SongSchema = z.object({
  name: z.string().min(1),
  artist: z.string().min(1),
  note: z.string().optional(),
  artworkUrl: z.string().optional(),
  previewUrl: z.string().optional(),
  album: z.string().optional(),
  releaseYear: z.string().optional(),
  youtubeVideoId: z.string().optional(),
  youtubeMusicUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  jioSaavnUrl: z.string().optional(),
  spotifyTrackId: z.string().optional(),
  spotifyUrl: z.string().optional(),
  appleMusicUrl: z.string().optional(),
});

const PlaylistSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  artworkUrl: z.string().optional(),
  youtubePlaylistId: z.string().optional(),
  youtubeMusicUrl: z.string().optional(),
  jioSaavnUrl: z.string().optional(),
  spotifyPlaylistId: z.string().optional(),
  spotifyUrl: z.string().optional(),
});

const GenerateMusicRecommendationsOutputSchema = z.object({
  songs: z.array(SongSchema).min(1).max(5),
  playlists: z.array(PlaylistSchema).min(1).max(2),
  analysis: z.string().min(1),
});
export type GenerateMusicRecommendationsOutput = z.infer<
  typeof GenerateMusicRecommendationsOutputSchema
>;

const STATIC_MODEL_CANDIDATES = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.6-27b',
  'llama-3.3-70b-versatile',
];

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY is not configured. Add GROQ_API_KEY to your .env.local file.'
    );
  }
  return new Groq({ apiKey });
}

async function resolveCandidateModels(client: Groq): Promise<string[]> {
  const preferred = process.env.GROQ_MODEL?.trim();
  const baseList = preferred
    ? [preferred, ...STATIC_MODEL_CANDIDATES.filter((m) => m !== preferred)]
    : [...STATIC_MODEL_CANDIDATES];

  try {
    const listResponse = await client.models.list();
    const availableIds = new Set((listResponse.data ?? []).map((m) => m.id));
    if (availableIds.size === 0) {
      return baseList;
    }

    const matchedStatic = baseList.filter((m) => availableIds.has(m));
    const dynamicFallbacks = [...availableIds].filter(
      (id) =>
        !matchedStatic.includes(id) &&
        !id.includes('whisper') &&
        !id.includes('orpheus') &&
        !id.includes('guard') &&
        !id.includes('safeguard')
    );

    return [...matchedStatic, ...dynamicFallbacks];
  } catch {
    return baseList;
  }
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Model returned invalid JSON.');
  }
}

function normalizeRawResponse(rawObj: any) {
  const rawSongs = Array.isArray(rawObj?.songs) ? rawObj.songs : [];
  const rawPlaylists = Array.isArray(rawObj?.playlists) ? rawObj.playlists : [];

  const songs = rawSongs
    .map((item: any) => ({
      name: String(item?.name ?? item?.title ?? item?.song ?? '').trim(),
      artist: String(item?.artist ?? item?.singer ?? item?.performer ?? '').trim(),
      note:
        typeof item?.note === 'string' && item.note.trim().length > 0
          ? item.note.trim()
          : typeof item?.reason === 'string' && item.reason.trim().length > 0
            ? item.reason.trim()
            : undefined,
    }))
    .filter(
      (s: { name: string; artist: string }) =>
        s.name.length > 0 && s.artist.length > 0
    )
    .slice(0, 5);

  const playlists = rawPlaylists
    .map((item: any) => ({
      name: String(item?.name ?? item?.title ?? '').trim(),
      description: String(item?.description ?? item?.summary ?? '').trim(),
    }))
    .filter(
      (p: { name: string; description: string }) =>
        p.name.length > 0 && p.description.length > 0
    )
    .slice(0, 2);

  const analysis =
    typeof rawObj?.analysis === 'string' && rawObj.analysis.trim().length > 0
      ? rawObj.analysis.trim()
      : 'Selected tracks tailored to match the tone, pacing, and atmosphere of your current mood.';

  return { songs, playlists, analysis };
}

export async function generateMusicRecommendations(
  input: GenerateMusicRecommendationsInput
): Promise<GenerateMusicRecommendationsOutput> {
  const { mood, language, genres } =
    GenerateMusicRecommendationsInputSchema.parse(input);
  const client = getGroqClient();
  const candidateModels = await resolveCandidateModels(client);

  const systemPrompt = [
    'You are an experienced music curator and radio director.',
    'Recommend real, commercially released, well-known songs that genuinely exist on YouTube Music, JioSaavn, and Spotify.',
    'Never invent fictional songs or artists.',
    'For playlist names, use searchable, widely recognized playlist titles on streaming platforms (e.g., "Late Night Synthwave", "Bollywood Acoustic Chill", "Indie Midnight Drive").',
    'Write concise, grounded liner notes without cliches or robotic phrasing.',
    'Always respond with a single valid JSON object only.',
  ].join(' ');

  const userPrompt = `Listener context:
- Current mood / setting: "${mood}"
- Preferred language: "${language}"
- Selected genres: ${genres.map((g) => `"${g}"`).join(', ')}

Return a JSON object with this exact shape:
{
  "songs": [
    {
      "name": "Exact track title",
      "artist": "Primary artist name",
      "note": "One concise sentence on the musical texture or why this track fits the mood"
    }
  ],
  "playlists": [
    {
      "name": "Searchable playlist title that exists on streaming platforms",
      "description": "One concise sentence describing the sonic direction and mood arc"
    }
  ],
  "analysis": "2 sentences reading the listener's mood and explaining the musical direction chosen (tempo, instrumentation, atmosphere)."
}

Requirements:
- "songs" must contain exactly 5 real tracks matching "${language}" and the selected genres.
- "playlists" must contain exactly 2 distinct playlist directions.`;

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.65,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error(`Empty response from model ${model}`);
      }

      const parsedJson = extractJsonObject(rawContent);
      const normalized = normalizeRawResponse(parsedJson);
      const validated = GenerateMusicRecommendationsOutputSchema.parse(normalized);

      const [enrichedSongs, enrichedPlaylists] = await Promise.all([
        Promise.all(
          validated.songs.map(async (song) => {
            const meta = await enrichSongAcrossPlatforms(song.name, song.artist);
            return { ...song, ...meta };
          })
        ),
        Promise.all(
          validated.playlists.map(async (pl) => {
            const meta = await enrichPlaylistAcrossPlatforms(
              pl.name,
              genres,
              language
            );
            return { ...pl, ...meta };
          })
        ),
      ]);

      return {
        ...validated,
        songs: enrichedSongs,
        playlists: enrichedPlaylists,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message.toLowerCase();
      const shouldTryNext =
        msg.includes('model_not_found') ||
        msg.includes('decommissioned') ||
        msg.includes('does not exist') ||
        msg.includes('rate_limit') ||
        msg.includes('429') ||
        msg.includes('404') ||
        msg.includes('503') ||
        msg.includes('empty response') ||
        msg.includes('invalid json');

      if (!shouldTryNext) {
        break;
      }
    }
  }

  throw lastError ?? new Error('Unable to generate recommendations right now.');
}

'use server';

import Groq from 'groq-sdk';
import { z } from 'zod';

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const GenerateMusicRecommendationsInputSchema = z.object({
  mood: z.string(),
  language: z.string(),
  genres: z.array(z.string()),
});
export type GenerateMusicRecommendationsInput = z.infer<typeof GenerateMusicRecommendationsInputSchema>;

const GenerateMusicRecommendationsOutputSchema = z.object({
  songs: z.array(z.object({
    name: z.string(),
    artist: z.string(),
  })).length(5),
  playlists: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })).length(2),
  analysis: z.string(),
});
export type GenerateMusicRecommendationsOutput = z.infer<typeof GenerateMusicRecommendationsOutputSchema>;

export async function generateMusicRecommendations(
  input: GenerateMusicRecommendationsInput
): Promise<GenerateMusicRecommendationsOutput> {
  const { mood, language, genres } = input;

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are Moodify, a music recommendation assistant. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `A user feels "${mood}", prefers music in "${language}", and likes genres: ${genres.map(g => `"${g}"`).join(', ')}.

Respond with a JSON object containing:
- "songs": array of exactly 5 objects with "name" and "artist"
- "playlists": array of exactly 2 objects with "name" and "description"
- "analysis": a brief string explaining the mood and recommendations`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('No response from Groq');

  const parsed = JSON.parse(raw);
  return GenerateMusicRecommendationsOutputSchema.parse(parsed);
}

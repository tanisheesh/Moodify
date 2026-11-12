import "server-only";
import Groq from "groq-sdk";

const STATIC_MODEL_CANDIDATES = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "llama-3.3-70b-versatile",
];

let cachedModels: { ids: string[]; expiresAt: number } | null = null;

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured. Add GROQ_API_KEY to your environment variables."
    );
  }
  return new Groq({ apiKey });
}

export async function resolveGroqCandidateModels(
  client: Groq
): Promise<string[]> {
  const preferred = process.env.GROQ_MODEL?.trim();
  const baseList = preferred
    ? [preferred, ...STATIC_MODEL_CANDIDATES.filter((m) => m !== preferred)]
    : [...STATIC_MODEL_CANDIDATES];

  if (cachedModels && Date.now() < cachedModels.expiresAt) {
    return cachedModels.ids;
  }

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
        !id.includes("whisper") &&
        !id.includes("orpheus") &&
        !id.includes("guard") &&
        !id.includes("safeguard")
    );

    const resolved = [...matchedStatic, ...dynamicFallbacks];
    cachedModels = {
      ids: resolved,
      expiresAt: Date.now() + 10 * 60 * 1000, // Cache model list for 10 minutes
    };
    return resolved;
  } catch {
    return baseList;
  }
}

export function extractJsonFromText(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("Model returned invalid JSON.");
  }
}

export function isRetriableGroqError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("model_not_found") ||
    msg.includes("decommissioned") ||
    msg.includes("does not exist") ||
    msg.includes("rate_limit") ||
    msg.includes("429") ||
    msg.includes("404") ||
    msg.includes("503") ||
    msg.includes("empty response") ||
    msg.includes("invalid json")
  );
}

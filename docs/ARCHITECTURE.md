# Moodify — Architecture

<!--
Companion to PRD.md.
PRD says WHAT the system does. This says HOW.
Audience: an engineer who needs to understand the system well
enough to build it, debug it, or extend it.
No marketing language here — be precise.
-->

---

## 1. Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| AI | Groq API — Llama 3.3-70b-versatile (JSON mode) |
| Styling | Tailwind CSS 3 · shadcn/ui (Radix UI primitives) |
| Fonts | Geist Sans + Geist Mono |
| Validation | Zod 3 |
| Hosting | Vercel |

No database. No auth. No queue. The app is fully stateless — every request is independent.

---

## 2. Components

```
src/
  app/page.tsx                          Main UI — form, state, results render
  app/actions.ts                        Server Action — input validation + AI call
  app/layout.tsx                        Root layout with Geist fonts and Toaster
  ai/flows/interpret-mood.ts            Groq client, prompt, Zod response schema
  components/genre-selector.tsx         Checkbox grid for 126 genre options
  components/llm-recommendation-card.tsx  Song card with YouTube Music search link
  components/llm-playlist-card.tsx      Playlist theme card with YT Music search link
  components/splash-screen.tsx          Animated 4-second intro on first load
  components/loading-animation.tsx      Inline loading state for the submit button
  components/footer.tsx                 Page footer with GitHub link
  config/genres.ts                      Static list of 126 Spotify-style genre slugs
```

### `app/page.tsx` — Main Page

Client component that owns all UI state. Manages form submission via `useActionState`, tracks selected genres locally, and drives a character-by-character typing animation on the AI's mood analysis string. Shows the `SplashScreen` for 4 seconds on first load, then transitions to the main form. Does not call any server directly — delegates to the Server Action via `useTransition`.

### `app/actions.ts` — Server Action

The only server-side entry point. Receives raw `FormData`, parses and validates it with Zod (mood ≥ 1 char, language ≥ 1 char, genres ≥ 1 selected), calls `generateMusicRecommendations`, and returns a typed `ActionResponse`. Catches and serialises errors from Groq into a user-readable message rather than letting them propagate unformatted.

### `ai/flows/interpret-mood.ts` — Groq Flow

Instantiates the Groq SDK with `GROQ_API_KEY`. Sends a two-message chat completion (system + user) to `llama-3.3-70b-versatile` with `response_format: { type: 'json_object' }`. Parses the raw string response with `JSON.parse`, then validates the shape with a Zod schema — exactly 5 songs (name + artist), exactly 2 playlists (name + description), plus an analysis string. Throws on parse or validation failure so the Server Action can catch it.

### `components/genre-selector.tsx` — Genre Picker

Renders a scrollable checkbox grid. Shows 18 popular genres by default with a "Show More" toggle that expands to all 126. Selected genres are lifted to page state and appended to `FormData` before submission.

### `components/llm-recommendation-card.tsx` — Song Card

Displays song name, artist, a deterministic placeholder image from `picsum.photos` (seeded on song name + artist), and a "Listen" button that opens a YouTube Music search URL. The URL is generated client-side — no external API needed.

### `components/llm-playlist-card.tsx` — Playlist Card

Displays playlist name and AI-generated description. A "Find on YouTube Music" button generates a search URL from the playlist name.

---

## 3. Data Flow

```
[User] -- fills mood, language, genres --> [page.tsx form]
  --> handleSubmit builds FormData
  --> startTransition(formAction(formData))
      --> [actions.ts: fetchRecommendations]
          --> Zod validates (mood ≥ 1 char, language ≥ 1 char, genres ≥ 1)
          --> [interpret-mood.ts: generateMusicRecommendations]
              --> Groq API (llama-3.3-70b-versatile, JSON mode)
              --> JSON.parse + Zod schema validation
          <-- { songs[5], playlists[2], analysis }
      <-- ActionResponse { success: true, data }
  <-- formState updated via useActionState
[page.tsx] renders song cards + playlist cards + typing analysis
```

1. User fills the mood textarea, language input, and selects at least one genre.
2. `handleSubmit` collects form data, appends selected genres, and calls the Server Action via `useTransition`.
3. `fetchRecommendations` validates input with Zod. Validation errors are returned as `errors[]` and displayed as destructive toasts.
4. On success, `generateMusicRecommendations` sends the structured prompt to Groq.
5. Groq returns a JSON string; it is parsed and validated against the Zod output schema. Schema mismatch throws immediately.
6. The Server Action maps the output to `RecommendationResult` and returns it to the client.
7. The client receives the response, starts the typing animation for `analysis`, and renders song and playlist cards.

---

## 4. AI / LLM Design

### Input

Structured natural language composed server-side from three validated user inputs:
- `mood` — free-text description of the user's current emotional state
- `language` — preferred language for the recommended music
- `genres` — array of genre slugs selected from a fixed list of 126

Never raw file content, diffs, or unvalidated user text beyond the mood field.

### System prompt strategy

```
"You are Moodify, a music recommendation assistant. Always respond with valid JSON only."
```

Minimal system prompt. The user turn carries all the structure. The explicit JSON-only instruction prevents prose preamble that would break `JSON.parse`. `response_format: { type: 'json_object' }` is set at the API level as an additional hard constraint.

### Response schema

```jsonc
{
  "songs": [
    { "name": "string", "artist": "string" }
    // exactly 5 items — enforced by Zod .length(5)
  ],
  "playlists": [
    { "name": "string", "description": "string" }
    // exactly 2 items — enforced by Zod .length(2)
  ],
  "analysis": "string"  // brief explanation of mood and recommendations
}
```

### Validation

Response is passed through `JSON.parse` then `GenerateMusicRecommendationsOutputSchema.parse(parsed)` (Zod strict). Any shape mismatch — wrong array length, missing field, wrong type — throws a Zod error. The Server Action's try/catch converts this to a user-facing error message; the request fails cleanly rather than rendering broken cards.

### Failure handling

If Groq is unavailable or the model returns a non-parseable response, the Server Action catches the error, extracts `error.message` (and `error.details` if present), and returns `{ success: false, message: errorMessage }`. The client displays this as a destructive toast. The UI does not crash; the form remains usable for a retry.

---

## 5. API Routes

There are no explicit Next.js API routes. All server logic runs through a single Next.js Server Action:

| Entry | Description |
|---|---|
| `fetchRecommendations` (Server Action) | Validates form input, calls Groq, returns structured recommendation data |

The Server Action is invoked via `useActionState` — no `POST /api/...` endpoint is exposed.

---

## 6. Security

- **Secrets:** `GROQ_API_KEY` is read exclusively in `ai/flows/interpret-mood.ts`, a `'use server'` module. No `NEXT_PUBLIC_` prefix — the key never reaches the browser bundle.
- **Input validation:** All user-provided values are validated with Zod inside the Server Action before any external call. Empty mood, empty language, and zero genres are rejected before hitting Groq.
- **No user data stored:** The app is stateless. No session, no database, no auth — there is nothing to exfiltrate.
- **External links:** YouTube Music URLs are constructed from AI-returned strings client-side and opened with `target="_blank" rel="noopener noreferrer"` — no redirect endpoint.

---

## 7. Error Handling & Reliability

| Failure | Behaviour |
|---|---|
| Zod validation failure (user input) | Returns `errors[]` array; destructive toast shown per field |
| Groq API down / timeout | Exception caught in Server Action; descriptive error toast displayed |
| Malformed JSON from model | `JSON.parse` throws; caught, surfaces as error message to user |
| Zod schema mismatch on AI response | Zod throws; caught, surfaces as error message to user |
| Missing `GROQ_API_KEY` | Groq SDK throws at construction; caught, surfaces as "unexpected error" |

---

## 8. Deployment

1. Vercel project linked to the GitHub repo — auto-deploy on push to `main`.
2. Single environment variable (`GROQ_API_KEY`) set in the Vercel project dashboard under encrypted env vars.
3. No build-time migrations, no database provisioning. `next build` is the entire build step.
4. Dev server runs on port 9002 via `next dev --turbopack -p 9002`.

---

## 9. Explicit Scope Cuts

- **User accounts / auth** — Single-session stateless recommendations are sufficient for v1. Auth would require a database and session management with no clear user benefit at this scale.
- **Spotify / Apple Music integration** — Requires OAuth and platform-specific API quotas. YouTube Music search URLs achieve the same "find this song" goal without credentials.
- **Playlist saving / history** — No persistence layer exists; deferred to v2 when user demand justifies a database.
- **Real audio playback** — Embedding a player requires licensing agreements. Linking to YouTube Music is the pragmatic alternative.
- **Rate limiting / abuse protection** — Groq's free-tier limits provide implicit capping for v1. Explicit per-IP rate limiting is a v2 concern.

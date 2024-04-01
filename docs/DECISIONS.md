# Engineering Decisions — Moodify

<!-- PURPOSE OF THIS FILE
     This is not user documentation. This is for technical interviewers
     and senior engineers who want to understand WHY the system is built
     the way it is. Every entry should answer a question an interviewer
     might ask. If you can't explain the tradeoff, the decision doesn't
     belong here yet.
-->

---

## Decision 1 — Groq (Llama 3.3-70b) over OpenAI or Anthropic

**Context:** The app needs an LLM capable of strict JSON output with a fixed schema (exactly 5 songs, exactly 2 playlists) and enough music domain knowledge to reason about mood-to-genre mapping across dozens of genres and languages.

**Decision:** Groq API with the `llama-3.3-70b-versatile` model in JSON mode (`response_format: { type: 'json_object' }`).

**Reason:** Groq's free tier provides sub-second model inference on Llama 3.3-70b with no billing setup — essential for a portfolio demo that must stay live indefinitely at no cost. The model quality is sufficient for music-genre matching and multilingual mood interpretation. JSON mode eliminates the need for prompt-level output enforcement beyond the response schema instruction.

**Tradeoff:** Groq's free tier has request-per-minute and daily token limits. Under high demo traffic the app could hit rate limits and return errors until the quota resets. A self-hosted model or a paid tier would remove this ceiling.

---

## Decision 2 — Next.js Server Actions over a REST API layer

**Context:** Server-side logic (Groq API call, input validation) needs to be isolated from the browser to protect the API key. The choices were: (a) a traditional `POST /api/recommend` route, or (b) a Next.js Server Action.

**Decision:** A single Server Action (`fetchRecommendations` in `app/actions.ts`) invoked via `useActionState`.

**Reason:** Server Actions run exclusively on the server — `GROQ_API_KEY` is never serialised into the client bundle. Colocating the action with the UI page eliminates route file boilerplate and keeps the entire request lifecycle (form submit → validate → call AI → return result) in one readable file. `useActionState` provides built-in pending state and progressive enhancement without extra client wiring.

**Tradeoff:** Server Actions are Next.js-specific. The logic is not reusable as a standalone API endpoint if a mobile app or third-party integration is added later. A REST route would have been more portable; a Server Action is simpler for the current single-client scope.

---

## Decision 3 — Fully stateless app (no database, no auth)

**Context:** Designing the persistence layer for v1. Options ranged from a full Postgres + auth stack to keeping the app stateless.

**Decision:** No database. No authentication. Every recommendation request is independent and ephemeral.

**Reason:** Music recommendations from mood descriptions are inherently one-shot interactions — users don't expect to retrieve last week's results. Dropping persistence eliminates an entire deployment dependency (managed Postgres, connection pooling, migrations) and reduces the Vercel project to a single environment variable. This means the live demo is trivially reliable: no DB cold starts, no migration drift.

**Tradeoff:** Users cannot save recommendations, build a history, or access results across sessions. If usage patterns show strong demand for history (e.g., "what did I listen to when I was in that mood last month"), a database becomes necessary — but the feature needs to earn that complexity.

---

## Decision 4 — Zod schema validation on the AI response

**Context:** Groq's `response_format: json_object` guarantees valid JSON syntax but does not guarantee the correct shape. The UI depends on exactly 5 song objects and exactly 2 playlist objects — if those counts are wrong, the card grids break silently.

**Decision:** Parse the raw Groq response with `JSON.parse`, then run it through a strict Zod schema (`z.array(...).length(5)` / `.length(2)`) before the Server Action returns anything to the client.

**Reason:** Strict validation converts silent rendering failures (missing cards, undefined property errors) into explicit, catchable errors that display as user-facing toasts. It also forces the prompt/schema contract to be stated explicitly in code — if the schema changes, the Zod definition changes and tests catch it immediately.

**Tradeoff:** Zod adds a hard failure mode: if the model returns 4 songs instead of 5, the entire request errors out rather than displaying the 4 it did return. A lenient schema (`.min(1)`) would degrade more gracefully, at the cost of unpredictable card-grid layouts. The strict approach was chosen because a malformed partial result is more confusing to a recruiter demoing the app than a clear error message.

---

## Decision 5 — YouTube Music search links over Spotify / Apple Music OAuth

**Context:** Users need a way to actually listen to the recommended songs. Options were: (a) Spotify Web API to generate real playlist/track links, (b) Apple Music search, or (c) YouTube Music search URLs.

**Decision:** Generate YouTube Music search URLs client-side from the AI-returned song name and artist string. No API key or OAuth required.

**Reason:** Spotify's Web API requires an approved developer account, a client credentials OAuth flow, and per-user auth to create playlists. Apple Music requires an Apple Developer membership and MusicKit tokens. YouTube Music search URLs (`https://music.youtube.com/search?q=...`) require nothing — they work for any user regardless of whether they have a YouTube Music subscription. The search approach also gracefully handles hallucinated song titles: if the model invents an artist, the search still surfaces the closest real match.

**Tradeoff:** The "Listen" button opens a search page, not a direct track link. A user must still click the correct result. With Spotify integration, the app could open the exact track or even add it to a playlist — that UX is meaningfully better, but the implementation cost is disproportionate for v1.

---

## What I'd do differently in v2

- **Fix `typescript: { ignoreBuildErrors: true }`** — This flag in `next.config.ts` silences real type errors at build time. In v1 it unblocked fast shipping; in v2 it should be removed and all underlying type issues resolved properly.
- **Add per-IP rate limiting on the Server Action** — Groq's free tier can be exhausted by a single user hammering the form. A simple in-memory rate limiter (or Vercel's edge rate limiting) would protect quota without adding backend infrastructure.
- **Prefer popular tracks via system prompt** — The current prompt does not bias toward well-known songs, so the model occasionally recommends obscure or hallucinated tracks. Adding "prefer widely-known, commercially released tracks" to the system prompt would reduce the rate of dead YouTube Music searches.

---

## Explicit non-decisions (deferred to v2)

| Feature | Why deferred |
|---|---|
| User accounts and auth | No user benefit without persistence; auth adds significant complexity for zero v1 gain |
| Recommendation history | Requires a database; ephemeral recommendations are sufficient for the MVP use case |
| Spotify / Apple Music OAuth | Approved developer account + OAuth flow + quota management; YouTube Music search achieves 80% of the UX value at 0% of the cost |
| Audio preview playback | Licensing and rights management out of scope; out-of-app links are the pragmatic alternative |
| Streaming AI response (SSE) | Groq's JSON mode is incompatible with streaming; switching to token streaming would require abandoning schema enforcement |

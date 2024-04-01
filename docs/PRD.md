# Moodify — Product Requirements Document

**Status:** Final
**Owner:** Tanish Poddar
**One-liner:** A web app that takes your mood in natural language and returns AI-curated song and playlist recommendations via Groq's Llama 3.3-70b.

---

## 1. Problem

Picking music that actually matches how you feel in the moment is surprisingly hard. Streaming platforms surface algorithmic playlists built from listening history, not from how you feel right now. If you're restless at 2am, deep in a creative flow, or hyped before a workout, searching manually wastes time and rarely gets it right. There's a gap between "I know how I feel" and "I know what to search for" — Moodify closes it with a single natural-language input.

---

## 2. Goals (v1 / MVP)

1. Accept a free-text mood description (any language the user types) and produce relevant music recommendations without signup or friction.
2. Let the user narrow results by selecting preferred genres from a curated list of 126 options.
3. Accept a preferred music language so recommendations respect cultural and linguistic preference.
4. Return exactly 5 song recommendations and 2 playlist themes per request, with a brief AI-generated analysis of the mood.
5. Surface YouTube Music search links for every song and playlist so the user can listen immediately.
6. Deployed with a working live demo URL — no local setup needed to evaluate the product.

---

## 3. Non-Goals (explicit scope cuts)

- **User accounts and auth** — No signup flow. Recommendations are ephemeral; the session holds no history.
- **Playlist saving / export** — Users follow external links. In-app saves require a database and are deferred.
- **Spotify / Apple Music / YouTube Music OAuth** — Platform-specific API integration requires approved developer accounts, OAuth flows, and quota management. Linking to search results achieves the same UX goal without those constraints.
- **Audio playback in-app** — Licensing and rights management are out of scope. External links cover this.
- **Recommendation history** — Stateless by design in v1. No persistence layer exists.
- **Social sharing / collaborative playlists** — Out of scope for a solo MVP.

---

## 4. Users

**Primary:** Anyone who wants music that matches their current emotional state — students, remote workers, commuters, or anyone who describes their vibe more easily in words than in search terms.

**Secondary:** Technical recruiters and engineers evaluating this as a portfolio piece. The live demo needs to load fast, work on the first try, and demonstrate real AI integration — not a mocked response.

---

## 5. User Stories

1. *As a listener,* I describe how I'm feeling in one or two sentences so that I get song recommendations tailored to that exact mood without having to scroll through generic playlists.
2. *As a listener,* I select my preferred genres from a checkbox grid so that the recommendations stay within music I actually like.
3. *As a listener,* I specify a preferred language so that the recommendations include music in that language, not just English-language defaults.
4. *As a listener,* I click "Listen" on a song card so that I land directly on a YouTube Music search for that track without copying anything manually.
5. *As a listener,* I read the AI's mood interpretation so that I understand why those specific songs were chosen and can trust the recommendation logic.
6. *As a recruiter,* I open the live demo and get a working recommendation within seconds so that I can verify the AI integration is real and functional.

---

## 6. Functional Requirements

### 6.1 Mood Input

- The mood field accepts free-text input with a minimum of 1 character.
- The field is required; submission is blocked if empty.
- A placeholder gives examples: "Chilling after work, hyped for a party, deep in thought…"

### 6.2 Language Input

- A separate text field accepts the user's preferred music language (e.g., "English", "Español", "हिन्दी").
- Minimum 1 character; required.

### 6.3 Genre Selection

- A checkbox grid displays 18 popular genres by default (pop, rock, hip-hop, electronic, etc.).
- A "Show More" toggle expands the grid to all 126 available genres.
- At least 1 genre must be selected; submission is blocked otherwise.
- Selected genres persist across show/hide toggles.

### 6.4 AI Recommendation Generation

- On submit, the Server Action sends mood + language + genres to Groq (Llama 3.3-70b-versatile) with JSON mode enabled.
- The model returns exactly 5 songs (name + artist) and exactly 2 playlist themes (name + description), plus a mood analysis string.
- The response is validated with a Zod schema before being sent to the client.

### 6.5 Results Display

- 5 song cards are displayed in a responsive grid, each showing: placeholder cover art, song name, artist, and a "Listen" button.
- Each "Listen" button opens a YouTube Music search URL for `"{song name} {artist}"` in a new tab.
- 2 playlist theme cards display name and description, each with a "Find on YouTube Music" link.
- The mood analysis string is rendered with a character-by-character typing animation.

### 6.6 Error Handling

- Validation errors (empty fields, no genres selected) are shown as individual destructive toasts per field.
- AI or network errors are caught server-side and surfaced as a single descriptive error toast.
- The form remains functional after any error — the user can adjust input and resubmit.

### 6.7 Splash Screen

- On first page load, a full-screen splash reading "MOODIFY / Your Vibe, Your Music." is shown for 4 seconds, then fades out.

---

## 7. Non-Functional Requirements

- **Latency:** AI response should complete within 5–10 seconds under normal Groq load. The submit button shows an inline loading animation during the wait.
- **Security:** `GROQ_API_KEY` is accessed only in server-side code. It is never exposed to the browser bundle or logged.
- **Cost:** A single request sends one Groq API call per submission. No polling, no streaming, no background jobs.
- **Reliability:** If the AI provider is unavailable, the error is caught and shown to the user — the page does not crash or show a blank state.
- **Accessibility:** Labels, `aria-label` attributes, and `aria-live` on the submit button are used throughout. Genre checkboxes have explicit label associations.
- **Responsiveness:** The layout adapts from single-column (mobile) to a 2-column form and 5-column song grid (desktop). All breakpoints use Tailwind responsive prefixes.

---

## 8. Success Metrics

| Metric | Target |
|---|---|
| Live demo reliability | First-time visitor gets a populated result in < 15s |
| Zero unhandled errors | No `500` or blank page on any normal user path |
| Genre coverage | ≥ 100 genre options available |
| AI response correctness | Zod validation passes on ≥ 95% of Groq responses |

---

## 9. Risks & Open Questions

- **Groq rate limits on free tier** — High demo traffic could exhaust the free quota. Mitigated by the on-demand call pattern (one API call per user submit, not per page load). A paid plan is the v2 mitigation.
- **Malformed AI JSON** — Even with `response_format: json_object`, models can occasionally produce wrong array lengths or missing fields. Mitigated by strict Zod validation that surfaces a clear error rather than a broken UI.
- **Llama 3.3-70b hallucinated song titles** — The model may recommend songs or artists that don't exist. Mitigated by routing to YouTube Music search (not a direct track ID), so searches still surface real music even if the exact title is wrong.
- **Open question:** Should the model be instructed to prefer popular/well-known tracks, or is obscure music discovery acceptable?

---

## 10. v2 Candidates

- **Spotify OAuth integration** — Create actual playlists in the user's Spotify account directly from results.
- **Recommendation history** — Persist past recommendations per session or account so users can revisit them.
- **Audio preview** — Embed 30-second Spotify or YouTube previews inline without leaving the page.
- **Mood history heatmap** — Visualise emotional patterns over time if user accounts are introduced.
- **Rate limiting + abuse protection** — Per-IP request throttling to protect Groq quota in production.

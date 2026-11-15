# Moodify — Product Requirements Document

| Field | Value |
|---|---|
| **Status** | v1.0 Live |
| **Owner** | Tanish Poddar |
| **Live URL** | [https://moodify.tanisheesh.in](https://moodify.tanisheesh.in) |
| **One-liner** | Mood-driven music curation studio and cross-platform playlist exporter across Spotify, YouTube Music, JioSaavn, and Apple Music. |

---

## 1. Problem & Quantified Impact

Picking music that matches an immediate emotional context is difficult because streaming feeds optimize for historical listening habits rather than current mood. At the same time, listeners split across Spotify, YouTube Music, JioSaavn, and Apple Music waste significant time manually searching and rebuilding playlists track by track when sharing or migrating across ecosystems, often failing on noisy YouTube video titles or regional catalog mismatches. Moodify solves both problems in one zero-signup studio workspace.

| Dimension | Before (Manual / Baseline) | After (v1 Live) |
|---|---|---|
| Curate 5 mood-matched tracks with cross-platform links | ~5–10 min searching playlists and verifying links per service | 1 prompt → `5` tracks + `2` playlists enriched across `4` catalogs in parallel |
| Migrate/convert a 50-track playlist across ecosystems | ~20–30 min manual copy-paste & title cleanup (~10–20% missed on video titles) | Automated import (`50` tracks max), AI title cleanup, and `10`-track batched enrichment |
| Link resolution quality | Dead `/search?q=` redirects forcing manual selection | Exact canonical track & playlist IDs (`open.spotify.com/track/*`, `music.youtube.com/watch?v=*`, `jiosaavn.com/song/*`, `music.apple.com`) |
| Operating cost | $0 (manual work) | $0/mo within Vercel Hobby + Groq + Spotify free-tier quotas |

---

## 2. Goals (v1 / MVP)

1. Accept a natural-language mood description, preferred language (`7` presets or custom input), and genre selection (`126` genre slugs) to curate `5` verified tracks and `2` playlist directions with curator liner notes (`src/ai/flows/interpret-mood.ts`).
2. Resolve **exact canonical URLs** (zero `/search?q=` redirects) for every track and playlist across **Spotify**, **YouTube Music**, **JioSaavn**, and **Apple Music** in parallel via `Promise.all` (`src/lib/music-platforms.ts`).
3. Provide immediate in-app playback via sleeve audio previews (`320kbps` JioSaavn AAC / `30s` iTunes / Spotify preview), a continuous **JioSaavn 320kbps HD queue player**, and a docked **Spotify embed player**, all synchronized via `moodify:audio-play` events.
4. Import any public playlist URL (up to `50` tracks) from **Spotify**, **YouTube / YouTube Music**, **JioSaavn**, or **Apple Music**, clean noisy YouTube video titles with Groq AI, and match across all `4` platforms (`src/lib/playlist-converter.ts`).
5. Export converted or curated tracks in one click to a user's **Spotify account** (private playlist up to `100` URIs via OAuth 2.0 `/api/spotify/*`) and instant **YouTube Music `TLGG` playlists** via `watch_videos` redirect inspection.
6. Ship a responsive dark-studio interface (`#09090b` canvas, `#E11D48` accent) across mobile (`320px`–`640px`) and desktop (`1280px+`) viewports, deployed live at [https://moodify.tanisheesh.in](https://moodify.tanisheesh.in).

---

## 3. Non-Goals (Explicit Scope Cuts)

- **Mandatory user accounts or database persistence** — Mood curation and playlist conversion work anonymously with zero signup. Spotify OAuth is invoked only on explicit `"Save to My Spotify"` clicks. Revisit only if saved mood history or cross-device library sync is requested.
- **Writing playlists directly into Apple Music or JioSaavn accounts** — Apple Music playlist *import* (read) works without credentials, while writing to a user's Apple Music library requires a paid Apple Developer MusicKit subscription ($99/yr), and JioSaavn has no public third-party OAuth write API.
- **Conversions above 50 tracks per request** — Capped at `MAX_TRACKS_TO_CONVERT = 50` to stay well inside serverless execution budgets and upstream API politeness limits without background job queues.

---

## 4. Users & Personas

- **Primary:** Listeners looking for music tuned to their current moment or wanting to move playlists between Spotify, YouTube Music, JioSaavn, and Apple Music without manual searching.
- **Secondary:** Engineers and technical reviewers evaluating multi-platform API orchestration, resilient structured LLM output handling, and responsive UI craft.

---

## 5. User Stories & Acceptance Criteria

### Story 1 — Mood-to-Track Curation
*As a listener, I want to describe my mood, choose a language, and select genres so that I receive real curated songs with playable previews and exact platform links.*
- **Given** the Mood Curation tab is active, **When** the user enters a mood (or clicks one of `5` quick scenarios), picks a language, selects `>= 1` genre from the `126`-genre selector, and submits, **Then** `fetchRecommendations` validates inputs with Zod, invokes Groq with dynamic model fallback, enriches `5` songs + `2` playlists across `4` platforms, and renders track cards with direct links and audio playback.
- **Given** empty mood text or `0` genres selected, **When** submitted, **Then** `RecommendationInputSchema.safeParse()` fails and surfaces field-level toast errors without calling Groq.

### Story 2 — Synchronized In-App Playback
*As a listener, I want to preview tracks on cards, play the full JioSaavn queue, or open the Spotify dock without overlapping audio streams.*
- **Given** a curated or converted track has a `fullAudioUrl`, `previewUrl`, or `spotifyTrackId`, **When** the user clicks play on a card while another track, the JioSaavn queue, or the Spotify dock is active, **Then** `broadcastAudioPlay(id)` fires `moodify:audio-play` so all other active players pause or close immediately.

### Story 3 — Cross-Platform Playlist Import & Export
*As a listener, I want to paste a public playlist URL from Spotify, YouTube Music, JioSaavn, or Apple Music and export matched tracks to my chosen platform.*
- **Given** a valid public playlist URL, **When** submitted in `Playlist Exporter`, **Then** `convertPlaylistFromUrl` imports up to `50` tracks, cleans noisy YouTube titles via Groq, enriches tracks in `10`-track parallel batches, generates a `TLGG` YouTube Music playlist link, and enables source-aware export controls (`Save to My Spotify`, `Open YT Music Playlist`, `Play JioSaavn Playlist`, `Copy List`).
- **Given** an unsupported URL or private/empty playlist, **When** submitted, **Then** `convertPlaylistAction` returns `{ success: false, message }` and renders a destructive toast error without crashing the UI.
- **Given** `"Save to My Spotify"` is clicked without an active `moodify_sp_user_token` cookie, **When** `POST /api/spotify/create-playlist` returns `401`, **Then** `SaveToSpotifyButton` opens a centered `/api/spotify/login` OAuth popup, captures `SPOTIFY_AUTH_SUCCESS` via `postMessage`, retries playlist creation, and displays a direct link to the newly created private Spotify playlist.

---

## 6. Functional Requirements

### 6.1 Mood Curation Studio (`01 / Mood-to-Track Engine`)
- Free-text mood textarea with `5` one-click quick scenarios (`Late night focus`, `Highway night drive`, `Rainy afternoon`, `Heavy training`, `Sunday morning`).
- `7` language quick pills (`English`, `Hindi`, `Punjabi`, `Spanish`, `Japanese`, `Korean`, `Instrumental`) plus `"Other..."` custom language input.
- Searchable `126`-genre selector showing `18` curated tags collapsed, live search filter, selected count badge, and expand/collapse toggle (`src/components/genre-selector.tsx`).
- Groq LLM curation (`src/ai/flows/interpret-mood.ts`) with response normalization and strict Zod validation (`1..5` songs, `1..2` playlists, non-empty analysis).

### 6.2 Multi-Platform Exact Link Engine (`src/lib/music-platforms.ts`)
- **Spotify Web API (`client_credentials`):** Searches `track:{name} artist:{primaryArtist}` with broad fallback (`limit=1`), returning `open.spotify.com/track/{id}`, album art, release year, and `preview_url` (`3,500ms` timeout, `86,400s` revalidate).
- **YouTube Music (`WEB_REMIX` internal API):** POSTs JSON to `music.youtube.com/youtubei/v1/search` with official Songs catalog filter (`EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D`) and unfiltered fallback (`4,000ms` timeout, `86,400s` revalidate).
- **JioSaavn API:** Queries `search.getResults` (`3,500ms` timeout, `86,400s` revalidate), upgrades artwork to `500x500`, and exchanges `encrypted_media_url` via `song.generateAuthToken` (`bitrate=320`, `2,500ms` timeout, `3,600s` revalidate).
- **iTunes Search API:** Queries `itunes.apple.com/search?entity=song&limit=1` (`3,500ms` timeout, `86,400s` revalidate), returning `music.apple.com` track URL, `600x600bb` artwork, and `30s` AAC preview.

### 6.3 Cross-Platform Playlist Exporter (`02 / 4-Platform Playlist Bridge`)
- `4` sample playlist chips (one per platform) for instant testing without hunting for links.
- Detects platform and extracts up to `50` tracks from Spotify embed `__NEXT_DATA__`, YouTube Music `WEB_REMIX` `browse`/`next`, JioSaavn `webapi.get`, or Apple Music `serialized-server-data`.
- Runs Groq AI title cleaning (`temperature: 0.1`) only for YouTube playlists matching noise tokens (`official`, `video`, `lyrics`, `audio`, `slowed`, `reverb`, `ft.`, `feat.`, brackets).
- Enriches matched tracks in batches of `10` via `enrichSongAcrossPlatforms` and hides redundant same-platform export buttons.

### 6.4 Playback, Layout & SEO Metadata Suite
- Responsive track cards (`flex-row` compact cards `<640px`, 5-column sleeve grid desktop), continuous JioSaavn HD queue bar with seekbar and next/previous controls, and bottom Spotify embed dock.
- Complete Next.js metadata suite: dynamic `opengraph-image.tsx` / `twitter-image.tsx` (`1200x630`), `icon.svg`, `sitemap.ts`, `robots.ts` (disallowing `/api/`), `manifest.ts`, and `WebApplication` JSON-LD schema.

---

## 7. Edge-Case & Failure Behavior Matrix

| Scenario | System Behavior | User Feedback / Status |
|---|---|---|
| Empty mood or zero genres | `RecommendationInputSchema.safeParse()` rejects before AI call | Destructive toast per Zod issue (`Missing input`) |
| Invalid or unsupported playlist URL | `detectPlaylistPlatform(url)` returns `null` before network fetch | Destructive toast (`Unsupported URL...`) |
| `GROQ_API_KEY` missing or invalid | `getGroqClient()` throws descriptive config error | Destructive toast (`Could not curate tracks`) |
| Groq `404` / `429` / `503` / malformed JSON | `isRetriableGroqError` cascades across `5` static + discovered models (`cleanTrackTitlesWithAI` falls back to raw titles) | Transparent recovery or error toast if all fail |
| One platform catalog misses a track | Failed resolver returns `null`; remaining platforms still populate links & artwork fallback order (`Spotify -> iTunes -> JioSaavn -> YouTube`) | Track renders with available platform buttons |
| Spotify OAuth unauthenticated (`401`) | `/api/spotify/create-playlist` returns `401 NOT_AUTHENTICATED`; UI opens `/api/spotify/login` popup | Centered OAuth popup -> automatic retry on `SPOTIFY_AUTH_SUCCESS` |
| Spotify OAuth popup blocked or closed | `window.open` returns `null` or `pollTimer` detects `popup.closed` (`500ms` interval) | `Popup blocked` toast or clean loading reset |
| Mobile viewport (`320px`–`640px`) | `overflow-x-hidden` root, compact `flex-row` track cards, stacked exporter controls | Zero horizontal scroll |

---

## 8. Non-Functional Requirements & Budgets

- **Latency & Timeouts:** Upstream `AbortSignal.timeout` caps keep per-resolver hangs bounded (`2.5s` JioSaavn auth, `3.0s–4.0s` track search, `6.0s–6.5s` playlist extraction); `24h` Next.js `fetch` cache accelerates repeated lookups.
- **Security:** `GROQ_API_KEY`, `SPOTIFY_CLIENT_ID`, and `SPOTIFY_CLIENT_SECRET` stay strictly server-side (`server-only` / `"use server"`). User OAuth tokens reside in `httpOnly`, `sameSite: "lax"` cookies. Security headers are enforced via `vercel.json`. *(Known hardening gaps tracked for v2: add Zod validation in `create-playlist`, strict URL host equality + `https:` enforcement in `detectPlaylistPlatform`, OAuth `state` CSRF parameter, and origin-pinned `postMessage`.)*
- **Type Safety:** `tsc --noEmit` (`pnpm run typecheck`) and `next build` (`pnpm run build`) pass cleanly under TypeScript `strict: true`.
- **Responsiveness:** Adaptive mobile-first layouts across `375px` mobile and `1280px+` desktop viewports.

---

## 9. Unit Economics & Quota Budget

| Resource | Free-Tier / Plan Limit | Estimated Usage per 1,000 Actions | Headroom / Scaling Note |
|---|---|---|---|
| Vercel Compute | Hobby plan (`100 GB-hrs`, `1M` edge requests) | ~0.3 GB-hrs (thin App Router + `24h` fetch cache) | Ignore docs-only builds via `vercel` config |
| Groq API | Developer/Free tier per-model RPM & TPD limits | ~500K–800K total tokens (JSON curation + occasional title cleanup) | `10m` cached `models.list()` + automatic multi-model fallback on `429` |
| Spotify Web API | Free app quota (`client_credentials` + `25` allowlisted Dev Mode OAuth users) | ~5,000 track search calls (`86,400s` cached) | Public visitor exports require Extended Quota approval from Spotify |
| YouTube Music / JioSaavn / iTunes | Unauthenticated public endpoints (no Data API v3 quota consumed) | ~5,000–50,000 requests (depending on mood vs 50-track batch mix) | `watch_videos` bypasses YouTube Data API v3's 50-unit/track playlist write cost |

---

## 10. Success Metrics & Instrumentation

| Metric | Target | How Measured |
|---|---|---|
| Mood curation turnaround | `< 5s` typical warm response | Vercel function execution logs (`actions.ts`) |
| Playlist conversion turnaround (up to 50 tracks) | `< 8s` across 5 batches (`batchSize = 10`) | Vercel function execution logs (`converter-actions.ts`) |
| Static & build reliability | `100%` passing `typecheck` + `build` + CodeQL + Gitleaks | GitHub Actions CI & Security workflows |

---

## 11. Risks, Assumptions & Open Questions

| Item | Impact | Mitigation / Status |
|---|---|---|
| **Spotify Development Mode 25-user OAuth limit** | High | Documented in `DEPLOY.md`; track matching (`client_credentials`) works for everyone, while `"Save to My Spotify"` requires allowlisted accounts until Extended Quota approval. |
| **Undocumented upstream endpoints (`WEB_REMIX`, JioSaavn API, Spotify embed `__NEXT_DATA__`, Apple `serialized-server-data`)** | Medium | Each importer/resolver isolates parsing inside dedicated functions with defensive fallbacks and descriptive errors. |
| **No persistent rate limiting or automated test suite yet** | Medium | Planned for v2 (Upstash Ratelimit on Server Actions + Vitest unit/integration tests + Playwright E2E/a11y). |

---

## 12. v2 Candidates

- **Streaming playlist conversion (SSE)** — Stream matched tracks row-by-row over Server-Sent Events as each 10-track batch completes.
- **Automated Test & A11y Baseline** — Add ESLint (`pnpm run lint`), Vitest unit tests (`playlist-converter.ts`, `groq.ts`, `utils.ts`), and Playwright + `@axe-core/playwright` E2E checks (`tests/e2e/smoke.spec.ts`).
- **Security Hardening Pass** — Add OAuth `state` CSRF token, exact URL hostname allowlisting + `https:` guard, Zod body validation on `/api/spotify/create-playlist`, and `postMessage` target origin restriction.
- **Rate Limiting & Spotify Extended Quota** — Add IP-based sliding-window rate limiting on Server Actions and submit for Spotify Extended Quota Mode.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>

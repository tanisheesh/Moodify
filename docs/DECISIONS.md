# Engineering Decisions — Moodify

---

## ADR-01 — Dynamic Groq Model Discovery & 5-Model Fallback Chain over a Hardcoded Model Slug

**Context:** Cloud LLM providers periodically decommission model IDs (e.g., deprecating older Llama slugs in favor of `openai/gpt-oss-120b` or `qwen/qwen3.8-27b`) and enforce per-model RPM/TPD limits. A single hardcoded model string causes production `404 model_not_found` or `429` outages.

### Options Considered

| Option | Latency | Monthly Cost | Ops Complexity | Verdict |
|---|---|---|---|---|
| **Dynamic `models.list()` (10m cache) + 5-model cascade** | ~50ms extra once per 10m; 0ms cached | $0 (Groq tier) | Low (~50 lines in `src/lib/groq.ts`) | ✅ **Chosen** |
| Single hardcoded model (`GROQ_MODEL` only) | 0ms overhead | $0 | Zero until deprecation breaks prod | ❌ Rejected |
| Multi-provider SDK router (OpenAI + Anthropic + Groq) | Higher cold-start & multiple billing accounts | $5–$20+ | Medium-High | ❌ Rejected |

**Decision & Reason:** Query `client.models.list()` at runtime (`cachedModels` with a `10-minute` TTL), prioritize `[GROQ_MODEL?, openai/gpt-oss-120b, qwen/qwen3.8-27b, openai/gpt-oss-20b, qwen/qwen3.6-27b, llama-3.3-70b-versatile]` plus discovered non-audio/non-guard chat models, and retry automatically when `isRetriableGroqError` sees `404`, `429`, `503`, empty responses, or invalid JSON.

**Tradeoff Accepted:** Fallback models have slightly different phrasing styles, and cold serverless instances spend one extra `models.list()` round-trip every 10 minutes.

**Reversal Trigger:** Revisit if Moodify adds a paid tier requiring deterministic single-model SLA guarantees or multi-provider failover via an external AI gateway.

---

## ADR-02 — Server-Side 4-Platform Exact Link Resolution over Client-Side `/search?q=` Links

**Context:** Linking track buttons to `open.spotify.com/search/...` or `music.youtube.com/search?q=...` forces the user to manually pick from search results and provides no official album art, release metadata, or playable in-app audio streams.

### Options Considered

| Option | Latency | Monthly Cost | Ops Complexity | Verdict |
|---|---|---|---|---|
| **Server-side parallel `Promise.all` across 4 catalogs (`24h` Next cache)** | ~0.8s–1.8s per song/batch | $0 | Medium (`music-platforms.ts`) | ✅ **Chosen** |
| Client-side `/search?q=` redirect URLs | 0ms | $0 | Trivial | ❌ Rejected |
| Paid third-party cross-link aggregator API (Odesli / Soundiiz) | ~1–3s | $10–$50/mo | Low | ❌ Rejected |

**Decision & Reason:** Resolve Spotify `/v1/search`, YouTube Music `WEB_REMIX`, JioSaavn `search.getResults` + `song.generateAuthToken`, and iTunes Search in parallel via `Promise.all`, bounded by `2.5s–4.0s` `AbortSignal` timeouts and cached for `86,400s` (`24h`). This delivers canonical track/playlist URLs, high-res cover art (`Spotify -> iTunes -> JioSaavn -> YouTube`), and immediate audio playback (`320kbps` JioSaavn AAC + `30s` previews) in one server round-trip.

**Tradeoff Accepted:** Requires maintaining 4 platform search adapters and exposes partial metadata if one upstream catalog misses or times out.

**Reversal Trigger:** Revisit if upstream rate limits cause `> 5%` missed platform matches under sustained traffic — migrate hot lookups to a dedicated Redis/PostgreSQL track-ID cache or licensed metadata API.

---

## ADR-03 — YouTube Music `WEB_REMIX` Internal API over `www.youtube.com/results` HTML Scraping

**Context:** Converting a 50-track playlist requires resolving up to 50 YouTube Music track IDs. Scraping `www.youtube.com/results` downloads ~1.5 MB of HTML per track, often returns fan uploads/lyric videos instead of official tracks, and triggers IP throttling after ~5 concurrent requests.

### Options Considered

| Option | Latency | Monthly Cost | Ops Complexity | Verdict |
|---|---|---|---|---|
| **`music.youtube.com/youtubei/v1/search` (`WEB_REMIX` Songs filter)** | ~200–400ms (~15 KB JSON) | $0 (no Data API quota) | Low | ✅ **Chosen** |
| Official YouTube Data API v3 (`search.list`) | ~250ms | $0 up to 10K units/day (~100 tracks/day!) | Low | ❌ Rejected |
| `www.youtube.com/results` HTML scraping | ~1.2s+ (~1.5 MB HTML) | $0 (throttled quickly) | Fragile | ❌ Rejected |

**Decision & Reason:** POST directly to `https://music.youtube.com/youtubei/v1/search?prettyPrint=false` with `WEB_REMIX` client context and the official Songs filter (`params: "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D"`), falling back to unfiltered `WEB_REMIX` search when a regional track is video-only. Note that YouTube Data API v3 charges `100` quota units per `search.list` call, which would exhaust the `10,000` daily free quota after just ~100 songs (two 50-track playlist conversions).

**Tradeoff Accepted:** Relies on YouTube Music's undocumented `WEB_REMIX` JSON shape and protobuf filter string (`EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D`).

**Reversal Trigger:** Revisit if YouTube blocks unauthenticated `WEB_REMIX` requests from cloud datacenter IPs or changes the `videoId` response structure — switch to official YouTube Data API v3 with paid quota expansion or user OAuth.

---

## ADR-04 — Server-Side `watch_videos` 302 Redirect Inspection for Instant YouTube Music Playlists

**Context:** Creating a YouTube playlist via YouTube Data API v3 requires Google OAuth verification and consumes `50` quota units per inserted track (exhausting the daily `10,000`-unit free limit after just 200 tracks).

### Options Considered

| Option | Latency | Monthly Cost | Ops Complexity | Verdict |
|---|---|---|---|---|
| **Inspect `302 Location` of `youtube.com/watch_videos?video_ids=...`** | ~300–600ms (`3.5s` timeout) | $0 (0 quota units) | Minimal (~35 lines) | ✅ **Chosen** |
| YouTube Data API v3 (`playlists.insert` + `playlistItems.insert`) | ~5–15s per 50 tracks | Quota exhausted at ~200 tracks/day | High (Google OAuth verification) | ❌ Rejected |

**Decision & Reason:** Issue a server-side `fetch` with `redirect: "manual"` to `https://www.youtube.com/watch_videos?video_ids=...` (up to `50` IDs) and parse `list=TLGG...` from the `302 Location` header to build `https://music.youtube.com/watch?v={firstId}&list={listId}`. Falls back cleanly to raw `watch_videos` URL if redirect inspection fails.

**Tradeoff Accepted:** Generated `TLGG...` queues are ephemeral anonymous playlists rather than saved permanent playlists inside a specific Google account.

**Reversal Trigger:** Revisit if users request persistent named playlists saved directly to their YouTube Music library — add Google OAuth (`youtube` scope) alongside Spotify OAuth.

---

## ADR-05 — Stateless Zero-Database Architecture with `httpOnly` OAuth Cookies & JioSaavn 320kbps Queue

**Context:** Most playlist bridges force account creation, require OAuth upfront before showing any value, and store user tokens in databases. Meanwhile, JioSaavn lacks a public third-party OAuth write API, and `30s` iTunes previews cut off continuous listening.

### Options Considered

| Option | Latency | Monthly Cost | Ops Complexity | Verdict |
|---|---|---|---|---|
| **Stateless app + on-demand `httpOnly` Spotify cookie + JioSaavn `320kbps` queue** | 0ms DB overhead | $0 | Low (zero DB migrations) | ✅ **Chosen** |
| PostgreSQL + Auth.js sessions + background jobs | +30–100ms DB queries | $0–$20/mo | High (schema, auth, GDPR/token encryption) | ❌ Rejected |

**Decision & Reason:** Keep mood curation and 4-platform playlist conversion 100% anonymous and stateless. Exchange JioSaavn's `encrypted_media_url` via `song.generateAuthToken` (`bitrate=320`, `1h` cache) to power a full-track continuous in-app queue player, and invoke Spotify OAuth 2.0 only on explicit `"Save to My Spotify"` clicks, storing the temporary token in an `httpOnly`, `sameSite: "lax"` cookie (`maxAge: 3600`).

**Tradeoff Accepted:** Users cannot view historical mood curations or manage long-term cross-platform sync across visits without re-running the action.

**Reversal Trigger:** Revisit when users demand saved mood history, scheduled playlist auto-sync, or server-side usage quotas (> `1,000` daily active users) — introduce PostgreSQL + encrypted refresh tokens.

---

## What I'd do differently in v2

- **Progressive SSE playlist conversion** — Stream each `10`-track batch over Server-Sent Events as it finishes rather than waiting for all 5 batches (`MAX_TRACKS_TO_CONVERT = 50`) before rendering the table.
- **Automated unit + E2E test harness from day 1** — Add `eslint`, Vitest unit tests (`detectPlaylistPlatform`, `extractJsonFromText`, `normalizeRawResponse`, OAuth handlers), and Playwright `@axe-core/playwright` smoke tests alongside `typecheck` and `build`.
- **Stricter boundary hardening** — Add OAuth `state` CSRF parameter, exact hostname + `https:` enforcement on playlist import URLs, Zod schema parsing on `/api/spotify/create-playlist`, and `max_tokens` caps on Groq completions.

---

## Explicit Non-Decisions (Deferred to v2)

| Feature | Why Deferred | Trigger to Build |
|---|---|---|
| Saved playlist/mood history & user accounts | Zero-friction anonymous usage converts better for a studio tool without auth walls | `> 100` repeat user requests for persistent history |
| Apple Music library write export | Requires paid $99/yr Apple Developer MusicKit token infrastructure | Commercial launch or MusicKit sponsorship |
| Upstash Redis rate limiting & shared metadata cache | Next.js `fetch` cache (`86,400s`) covers read bursts at current portfolio traffic | Sustained traffic exceeding Groq RPM limits or repeated `429` errors |

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>

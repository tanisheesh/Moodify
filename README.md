<p align="center">
  <img src="docs/logo.svg" width="64" height="64" alt="Moodify logo">
</p>

<h1 align="center">Moodify</h1>

<p align="center">
  <strong>Mood-driven music curation studio and cross-platform playlist exporter across Spotify, YouTube Music, JioSaavn, and Apple Music.</strong>
</p>

<p align="center">
  <a href="https://moodify.tanisheesh.in">
    <img src="https://img.shields.io/badge/live_demo-visit-E11D48?style=flat-square" alt="Live Demo">
  </a>
  <a href="https://github.com/tanisheesh/Moodify/actions/workflows/ci.yml">
    <img src="https://github.com/tanisheesh/Moodify/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="https://github.com/tanisheesh/Moodify/actions/workflows/codeql.yml">
    <img src="https://github.com/tanisheesh/Moodify/actions/workflows/codeql.yml/badge.svg" alt="CodeQL">
  </a>
  <img src="https://img.shields.io/badge/Next.js-black?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Spotify_API-1DB954?style=flat-square&logo=spotify&logoColor=white" alt="Spotify API">
  <img src="https://img.shields.io/badge/Groq-F55036?style=flat-square" alt="Groq">
  <img src="https://img.shields.io/badge/license-GPL--3.0-E11D48?style=flat-square" alt="License">
</p>

---

## What is Moodify?

Streaming platforms surface playlists built from historical listening habits rather than how you feel right now, and moving a playlist between ecosystems usually fails on messy video titles or regional catalog gaps. **Moodify** pairs a natural-language mood curation studio with a 4-platform playlist converter and exporter. Describe your current state, language, and sonic palette from 126 genres to get five curated tracks and two playlist directions with exact direct links and in-app audio playback — or paste any public playlist from Spotify, YouTube Music, JioSaavn, or Apple Music to match and export tracks across platforms in one click.

> **Live demo →** [https://moodify.tanisheesh.in](https://moodify.tanisheesh.in)

---

## What you get

- **Natural-language mood curation & 126-genre palette** — Describe how right now feels, pick a language, and filter 126 genres to receive 5 curated tracks, 2 playlist directions, and curator liner notes.
- **Exact direct platform links (zero `/search` redirects)** — Server-side parallel resolution matches every track and playlist to its canonical URL on **Spotify**, **YouTube Music**, **JioSaavn**, and **Apple Music**.
- **Cross-platform playlist converter & exporter** — Import up to 50 tracks from any public Spotify, YouTube Music, JioSaavn, or Apple Music playlist URL, clean noisy video titles via Groq AI, and export in one click.
- **In-app 320kbps HD queue player & Spotify studio dock** — Preview tracks on album sleeves, stream full tracks back-to-back via JioSaavn's authenticated `320kbps` AAC stream, or launch the docked Spotify player.

---

## By the numbers

| Metric | Value | Source |
|---|---|---|
| Sonic palette & presets | `126` genres · `7` language pills · `5` mood scenarios | `src/config/genres.ts`, `src/app/page.tsx` |
| Curation output budget | `5` verified tracks + `2` playlist directions per query | `src/ai/flows/interpret-mood.ts` |
| Playlist conversion cap | Up to `50` tracks in `10`-track parallel batches (`100` URI Spotify export max) | `src/lib/playlist-converter.ts`, `src/app/api/spotify/create-playlist/route.ts` |
| Upstream fetch timeouts | `2.5s–4.0s` per track resolver · `6.0s–6.5s` per playlist importer | `src/lib/music-platforms.ts`, `src/lib/playlist-converter.ts` |
| Caching & token windows | `24h` track metadata · `1h` JioSaavn 320kbps auth · `10m` Groq model list | `src/lib/music-platforms.ts`, `src/lib/groq.ts` |
| LLM fallback chain | `5` ordered candidate models + live `models.list()` discovery | `src/lib/groq.ts` |

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16.4 (App Router, Turbopack) · React 19.3 · TypeScript 7 · Tailwind CSS 3.4 · Radix UI · Geist |
| AI & Curation | Groq SDK 1.6 (`openai/gpt-oss-120b` primary + dynamic model discovery & fallback) · Zod 4.6 |
| Platform Resolvers | Spotify Web API & OAuth 2.0 · YouTube Music `WEB_REMIX` API · JioSaavn API (`320kbps` stream) · iTunes Search API |
| Infra & Security | Vercel (`vercel.json` security headers) · GitHub Actions CI · CodeQL · Gitleaks · Renovate |

---

## Engineering Decisions

**Why resolve exact track and playlist IDs server-side across 4 platforms instead of linking to `/search?q=`?**
Client-side search URLs force listeners to hunt through results manually and break when regional catalogs differ. Resolving Spotify `/v1/search`, YouTube Music's `WEB_REMIX` Song catalog (`EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D`), JioSaavn `search.getResults`, and Apple iTunes in parallel via `Promise.all` surfaces verified direct links, official cover art, and playable streams in one server round-trip.

**Why use YouTube Music's `WEB_REMIX` JSON endpoint and `watch_videos` redirect inspection over HTML scraping?**
Scraping `www.youtube.com/results` downloads ~1.5 MB of HTML per track and triggers IP throttling after ~5 concurrent requests. Querying `music.youtube.com/youtubei/v1/search` exchanges ~15 KB of JSON with zero batch throttling across 50-track conversions, while inspecting the `302 Location` header of `youtube.com/watch_videos?video_ids=...` yields a `TLGG...` playlist ID with zero OAuth or quota cost.

**Why dynamic Groq model discovery (`client.models.list()`) with a 5-model fallback chain?**
Hardcoding a single model slug breaks production when a provider deprecates a model family. Caching `client.models.list()` for 10 minutes and cascading across `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, `openai/gpt-oss-20b`, `qwen/qwen3.6-27b`, and `llama-3.3-70b-versatile` on `404`/`429`/`503` keeps curation online without code deploys.

**What would you do differently in v2?**
Move the 50-track playlist conversion loop to a Server-Sent Events (SSE) endpoint so each matched track streams into the UI progressively, and add a Vitest + Playwright `@axe-core/playwright` suite plus Upstash rate limiting on Server Actions.

---

## Docs

| Document | Description |
|---|---|
| [PRD](docs/PRD.md) | Product requirements — quantified impact, acceptance criteria, edge cases, unit economics |
| [Architecture](docs/ARCHITECTURE.md) | System topology (Mermaid), API & Server Action contracts, caching, LLM design, scale ceilings |
| [Decisions](docs/DECISIONS.md) | Technical ADRs — comparison matrices, tradeoffs, and reversal triggers |
| [Setup](docs/SETUP.md) | Local dev onboarding, env var matrix, verification commands, and troubleshooting |
| [Deploy](docs/DEPLOY.md) | Production topology, custom domain, smoke checks, rollback, and incident runbooks |
| [Contributing](CONTRIBUTING.md) | Branching, emoji commit style, and PR checklist |
| [Changelog](CHANGELOG.md) | Release history mapped to commit history |
| [Security](SECURITY.md) | Vulnerability reporting policy and security scope |

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>

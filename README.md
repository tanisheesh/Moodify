<p align="center">
  <img src="docs/logo.svg" width="64" height="64" alt="Moodify logo">
</p>

<h1 align="center">Moodify</h1>

<p align="center">
  <strong>Mood-driven music curation studio and cross-platform playlist exporter across Spotify, YouTube Music, JioSaavn, and Apple Music.</strong>
</p>

<p align="center">
  <a href="https://moodify.tanisheesh.in">
    <img src="https://img.shields.io/badge/live_demo-E11D48-E11D48?style=flat-square" alt="Live Demo">
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

Streaming platforms surface playlists built from historical listening habits rather than how you feel right now, and moving a playlist between ecosystems usually fails on messy video titles or regional catalog gaps. **Moodify** combines a natural-language mood curation engine with a 4-platform playlist converter and exporter. Describe your current state, language, and sonic palette from 126 genres to get five curated tracks and two playlist directions with exact direct links and in-app audio playback — or paste any public playlist from Spotify, YouTube Music, JioSaavn, or Apple Music to match and export tracks across platforms in one click.

> **Live demo →** [https://moodify.tanisheesh.in](https://moodify.tanisheesh.in)

---

## What you get

- **Natural-language mood curation & 126-genre sonic palette** — Describe how right now feels, pick a preferred language, and filter across 126 genres to receive 5 tracks, 2 playlist directions, and curator liner notes.
- **Exact direct platform links (zero `/search` redirects)** — Server-side parallel resolution matches every track and playlist to its exact canonical URL on **Spotify** (`open.spotify.com/track/{id}`), **YouTube Music** (`music.youtube.com/watch?v={id}`), **JioSaavn** (`jiosaavn.com/song/...`), and **Apple Music**.
- **Cross-platform playlist converter & exporter** — Import up to 50 tracks from any public Spotify, YouTube Music, JioSaavn, or Apple Music playlist URL, clean noisy video titles via Groq AI, and export to a generated YouTube Music playlist, a continuous JioSaavn 320kbps HD queue, or your own Spotify account via OAuth 2.0.
- **In-app 320kbps HD queue player & Spotify studio dock** — Preview tracks directly on album sleeves, stream full-length tracks back-to-back via JioSaavn's authenticated `320kbps` AAC stream, or launch the docked Spotify embed player without leaving the page.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS · Radix UI |
| AI & Curation | Groq SDK (`openai/gpt-oss-120b` primary + dynamic model discovery & fallback) · Zod |
| Platform Integrations | Spotify Web API & OAuth 2.0 · YouTube Music `WEB_REMIX` API · JioSaavn API (`320kbps` stream) · iTunes Search API |
| Infra & Hosting | Vercel · GitHub Actions CI · Dependabot Auto-Merge |

---

## Engineering Decisions

**Why resolve exact track and playlist IDs server-side across 4 platforms instead of linking to `/search?q=`?**
Client-side search URLs force the listener to manually hunt through results and fail when regional tracks differ across catalogs. Resolving Spotify `/v1/search`, YouTube Music's internal `WEB_REMIX` Song catalog (`EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D`), JioSaavn's `search.getResults`, and Apple iTunes in parallel via `Promise.all` surfaces verified direct track links, official album artwork, and playable audio streams in a single round-trip.

**Why use YouTube Music's `WEB_REMIX` JSON endpoint and `watch_videos` redirect inspection over HTML scraping?**
Scraping `www.youtube.com/results` downloads ~1.5 MB of HTML per song and triggers IP rate-limiting after 5–6 concurrent requests. Querying `music.youtube.com/youtubei/v1/search` (`WEB_REMIX`) exchanges ~15 KB of structured JSON with zero throttling across 50-track playlist batches, while inspecting the `302 Location` header of `youtube.com/watch_videos?video_ids=...` yields a persistent `TLGG...` playlist ID that opens directly in YouTube Music.

**Why dynamic Groq model discovery (`client.models.list()`) with a multi-model fallback chain?**
Hardcoding a single model identifier (such as `llama-3.3-70b-versatile`) breaks production the day a provider deprecates or renames the model slug. Querying active models and cascading across `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, and `openai/gpt-oss-20b` with automatic retry on `404`/`429` guarantees uninterrupted curation.

**What would you do differently in v2?**
Move the 50-track playlist conversion batches to a streaming Server-Sent Events (SSE) endpoint so each matched track renders progressively in the UI table as soon as its 4-platform lookup finishes, rather than waiting ~3 seconds for all batches to complete.

---

## Docs

| Document | Description |
|---|---|
| [PRD](docs/PRD.md) | Product requirements — goals, user stories, non-goals |
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, component breakdown |
| [Decisions](docs/DECISIONS.md) | Every major technical decision and why |
| [Setup](docs/SETUP.md) | Local dev setup and env vars |
| [Deploy](docs/DEPLOY.md) | Production deployment, domains, rollback |
| [Contributing](CONTRIBUTING.md) | How to propose changes |
| [Changelog](CHANGELOG.md) | What changed in each release |
| [Security](SECURITY.md) | How to report a vulnerability |

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>

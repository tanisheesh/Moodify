# Moodify — Product Requirements Document

**Status:** Final  
**Owner:** Tanish Poddar  
**One-liner:** A mood-driven music curation studio and 4-platform playlist converter that resolves exact playable track and playlist links across Spotify, YouTube Music, JioSaavn, and Apple Music.

---

## 1. Problem

Picking music that matches how you feel in the moment is surprisingly hard: streaming algorithms optimize for historical listening habits rather than your current emotional state. Even worse, music listeners are split across Spotify, YouTube Music, JioSaavn, and Apple Music — sharing or moving a playlist across platforms usually fails on noisy video titles or forces users through manual search pages. Moodify closes both gaps in one studio interface.

---

## 2. Goals

1. Accept a free-text mood description, preferred language, and genre selection (from 126 options) to curate 5 tracks and 2 playlist directions with curator liner notes.
2. Resolve **exact canonical URLs** (not `/search?q=` pages) for every track and playlist across **Spotify**, **YouTube Music**, **JioSaavn**, and **Apple Music**.
3. Provide immediate in-app playback via cover-art audio previews, a continuous **JioSaavn 320kbps HD queue player**, and a docked **Spotify embed player**.
4. Allow users to paste any public playlist link (up to 50 tracks) from **Spotify**, **YouTube Music**, **JioSaavn**, or **Apple Music** and convert/export it across platforms.
5. Support one-click playlist export to a user's **Spotify account** (via OAuth 2.0) and instant **YouTube Music `TLGG` playlist generation**.
6. Deliver a responsive dark-studio interface across all viewports (`320px` mobile to `1440px+` desktop).

---

## 3. Non-Goals

- **Mandatory user accounts or database persistence** — Mood curation and playlist conversion work immediately with zero signup. Spotify OAuth is invoked only when the user explicitly clicks "Save to My Spotify".
- **Writing playlists into Apple Music accounts** — Apple Music playlist import (read) is supported without credentials, whereas writing into a user's Apple Music library requires a paid Apple Developer membership and is out of scope.

---

## 4. Users

- **Primary:** Listeners who want music tailored to their exact current mood or who need to move playlists between Spotify, YouTube Music, JioSaavn, and Apple Music without manual searching.
- **Secondary:** Engineers and technical recruiters evaluating real multi-platform API orchestration, LLM structured output resilience, and responsive product UI craft.

---

## 5. User Stories

1. *As a listener,* I describe how I feel (or pick a quick scenario), select my language and genres, and get 5 curated songs with real album art, liner notes, and in-app audio playback.
2. *As a listener,* I click `Spotify`, `YT Music`, or `JioSaavn` on any track or playlist card and land directly on the exact song or playlist page rather than a search results screen.
3. *As a listener,* I switch to `Playlist Exporter`, paste a Spotify, YouTube Music, JioSaavn, or Apple Music playlist URL, and see all tracks matched across platforms within seconds.
4. *As a listener,* I export a converted playlist to YouTube Music (`Open YT Music Playlist`), play the full tracks back-to-back in the in-app `JioSaavn 320kbps HD Queue`, or save them directly to my Spotify account (`Save to My Spotify`).

---

## 6. Functional Requirements

### 6.1 Mood Curation Studio (`01 · Mood Curation`)

- Free-text mood textarea with one-click scenario presets (`Late night focus`, `Highway night drive`, `Rainy afternoon`, `Heavy training`, `Sunday morning`).
- Quick language pills (`English`, `Hindi`, `Punjabi`, `Spanish`, `Japanese`, `Korean`, `Instrumental`, plus custom language input).
- Searchable 126-genre selector with live text filter, selected count badge, and expand/collapse toggle.
- Groq AI inference with dynamic model discovery (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, `openai/gpt-oss-20b`), JSON normalization, and Zod validation.

### 6.2 Multi-Platform Exact Link Engine (`src/lib/music-platforms.ts`)

- Parallel resolution via `Promise.all` across:
  - **Spotify Web API (`client_credentials`):** Exact `open.spotify.com/track/{id}` & `open.spotify.com/playlist/{id}`, cover artwork, release year.
  - **YouTube Music (`WEB_REMIX` internal API):** Exact `music.youtube.com/watch?v={id}` (using the Songs catalog filter `EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D` + general fallback) and `music.youtube.com/playlist?list={id}`.
  - **JioSaavn API:** Exact `perma_url` for songs and playlists, `500x500` artwork, and `320kbps` full-track streams via `song.generateAuthToken`.
  - **iTunes Search API:** `600x600bb` artwork, `30s` preview streams, and `music.apple.com` links.

### 6.3 Cross-Platform Playlist Exporter (`02 · Playlist Exporter`)

- Auto-detects playlist URLs from Spotify, YouTube / YouTube Music, JioSaavn, and Apple Music (up to 50 tracks).
- Cleans noisy video titles using Groq AI before cross-platform matching.
- Source-aware export actions: hides redundant same-platform save buttons and surfaces `Open YT Music Playlist`, `Play JioSaavn Playlist (320kbps Queue)`, `Save to My Spotify`, and `Copy List`.

---

## 7. Non-Functional Requirements

- **Responsiveness:** Adaptive mobile-first layouts (`flex-row` compact track cards on `<640px`, 5-column sleeve grid on desktop, responsive queue bar and sticky navigation).
- **Security:** `GROQ_API_KEY`, `SPOTIFY_CLIENT_ID`, and `SPOTIFY_CLIENT_SECRET` are strictly server-only (`server-only` / `'use server'`). Spotify user OAuth tokens are stored in `httpOnly` cookies.
- **Type Safety:** Strict TypeScript validation (`tsc --noEmit`) enforced during `next build`.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>

# Moodify — Architecture

---

## 1. Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript, Turbopack) |
| AI | Groq SDK (`openai/gpt-oss-120b` primary + dynamic model discovery & fallback) |
| Platform Resolvers | Spotify Web API · YouTube Music `WEB_REMIX` API · JioSaavn API · iTunes Search API |
| Styling | Tailwind CSS · Radix UI Primitives · Geist Sans + Geist Mono |
| Validation | Zod |
| Hosting | Vercel |

---

## 2. Repository Structure

```
src/
  app/
    page.tsx                            Main studio UI (Mood Curation + Playlist Exporter tabs)
    layout.tsx                          Root layout, Geist fonts, JSON-LD schema, OpenGraph metadata
    opengraph-image.tsx                 Dynamic 1200x630 OpenGraph social card
    twitter-image.tsx                   Dynamic 1200x630 Twitter social card
    robots.ts                           Crawler rules (/robots.txt)
    sitemap.ts                          XML sitemap (/sitemap.xml)
    manifest.ts                         PWA web manifest (/manifest.webmanifest)
    icon.svg                            Vector brand icon
    actions.ts                          Server Action for mood curation + YT playlist link generation
    converter-actions.ts                Server Action for 4-platform playlist import & conversion
    api/spotify/
      login/route.ts                    Initiates Spotify OAuth 2.0 authorization flow
      callback/route.ts                 Exchanges OAuth code for token in httpOnly cookie + postMessage
      create-playlist/route.ts          Creates playlist and adds matched track URIs on Spotify
  ai/flows/
    interpret-mood.ts                   Mood curation prompt, response normalizer & Zod schema
  types/
    music.ts                            Canonical TypeScript interfaces for songs, playlists & actions
  lib/
    groq.ts                             Shared Groq client, 10-min cached model discovery & error classifier
    music-platforms.ts                  Parallel exact-link & stream resolver (Spotify, YT Music, JioSaavn, iTunes)
    playlist-converter.ts               Playlist importers (Spotify, YT, JioSaavn, Apple) + AI title cleaner
    utils.ts                            Class merging, cross-component audio sync & entity decoding
  components/
    genre-selector.tsx                  Searchable 126-genre tag selector
    llm-recommendation-card.tsx         Responsive song card with in-app preview & exact platform links
    llm-playlist-card.tsx               Playlist card with inline Spotify embed toggle & exact links
    playlist-converter.tsx              Cross-platform playlist exporter & JioSaavn 320kbps queue player
    save-to-spotify-button.tsx          OAuth popup coordinator for 1-click Spotify playlist creation
    splash-screen.tsx                   Animated studio splash screen
    loading-animation.tsx               Equalizer wave loading indicator
    footer.tsx                          Product footer
  config/
    genres.ts                           126 genre slugs
```

---

## 3. Data Flow

### 3.1 Mood Curation Flow

```
[User] -> enters mood, language, genres -> [page.tsx]
  -> Server Action: fetchRecommendations (actions.ts)
      -> Zod input validation
      -> generateMusicRecommendations (interpret-mood.ts)
          -> resolveCandidateModels(client) via Groq models.list()
          -> Groq chat.completions.create (JSON mode)
          -> normalizeRawResponse + Zod schema validation
          -> Promise.all: enrichSongAcrossPlatforms & enrichPlaylistAcrossPlatforms
              -> Spotify Web API (/v1/search)
              -> YouTube Music WEB_REMIX API (/youtubei/v1/search)
              -> JioSaavn API (search.getResults + song.generateAuthToken 320kbps)
              -> iTunes Search API
      -> generateYouTubePlaylistLinks (watch_videos -> 302 Location TLGG playlist ID)
  <- ActionResponse { songs[5], playlists[2], analysis, youtubeQueueUrl }
```

### 3.2 Cross-Platform Playlist Converter Flow

```
[User] -> pastes Spotify / YT Music / JioSaavn / Apple Music playlist URL
  -> Server Action: convertPlaylistAction (converter-actions.ts)
      -> detectPlaylistPlatform(url)
      -> Platform-specific extractor (up to 50 tracks):
          - Spotify: open.spotify.com/embed/playlist/{id} (__NEXT_DATA__ entity.trackList)
          - YouTube: music.youtube.com/youtubei/v1/browse (WEB_REMIX VL{listId})
          - JioSaavn: jiosaavn.com/api.php (__call=webapi.get&type=playlist)
          - Apple Music: serialized-server-data track descriptors
      -> cleanTrackTitlesWithAI (Groq normalizes noisy YouTube video titles)
      -> Batch parallel enrichment (batchSize = 10) via enrichSongAcrossPlatforms
      -> generateYouTubePlaylistLinks -> TLGG playlist ID
  <- PlaylistConversionResult { source, tracks, youtubeMusicPlaylistUrl, spotifyTrackUris }
```

---

## 4. API Routes

| Route | Method | Description |
|---|---|---|
| `/api/spotify/login` | `GET` | Redirects popup to `accounts.spotify.com/authorize` with `playlist-modify-*` scopes |
| `/api/spotify/callback` | `GET` | Exchanges authorization `code` for access token, sets `moodify_sp_user_token` `httpOnly` cookie, notifies opener window |
| `/api/spotify/create-playlist` | `POST` | Creates a private playlist in the user's Spotify account (`POST /v1/me/playlists`) and inserts `spotify:track:*` URIs |

---

## 5. Security

- **Server-only secrets:** `GROQ_API_KEY`, `SPOTIFY_CLIENT_ID`, and `SPOTIFY_CLIENT_SECRET` never leave the server runtime (`'use server'` and `import "server-only"`).
- **`httpOnly` OAuth cookies:** User Spotify tokens are stored in `httpOnly`, `sameSite: "lax"` cookies and are never readable by client JavaScript.
- **Strict input validation:** All user inputs and external API responses are sanitized and validated with Zod before rendering.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>

# Changelog

All notable changes to **Moodify** are documented here.

---

## [1.0.0] — 2024-06-30

### ✨ Added
- Natural-language mood curation engine powered by Groq LLM inference with dynamic model discovery (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, `openai/gpt-oss-20b`) and strict Zod response validation
- Searchable 126-genre sonic palette with selected genre count badge, instant search filtering, and one-click mood scenario presets
- Quick language selector supporting English, Hindi, Punjabi, Spanish, Japanese, Korean, Instrumental, and custom languages
- 4-platform server-side exact link resolver (`src/lib/music-platforms.ts`) matching every track and playlist to exact canonical URLs across **Spotify**, **YouTube Music**, **JioSaavn**, and **Apple Music**
- Cross-platform Playlist Converter & Exporter (`src/lib/playlist-converter.ts`) supporting public playlists up to 50 tracks from Spotify, YouTube Music, JioSaavn, and Apple Music
- Spotify OAuth 2.0 playlist creation flow (`/api/spotify/*`) to save curated or converted tracklists directly into a user's Spotify account
- Server-side YouTube Music `TLGG` playlist generator and in-app JioSaavn `320kbps` HD continuous playlist queue player with seekbar and track controls
- Complete Next.js 16 SEO & metadata suite (`opengraph-image`, `twitter-image`, `icon.svg`, `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, and JSON-LD `WebApplication` schema)

### 🎊 Improved
- Responsive dark-studio product UI (`#09090b`) adapting from compact horizontal track cards on mobile viewports (`<640px`) to 5-column record sleeves on desktop
- Custom dark-glass toast notifications with status indicator dots and auto-dismiss timing
- Polished splash screen with ambient glow, progress hairline, and smooth cubic-bezier fade-out

### 🐛 Fixed
- Resolved React 19 `useActionState` compatibility with Next.js 16 App Router
- Switched YouTube track resolution from HTML scraping to YouTube Music's `WEB_REMIX` Song catalog API to eliminate batch rate-limiting
- Replaced module-level Groq client initialization with lazy server-side instantiation and multi-model fallback

### 💀 Removed
- Removed 222 unused template dependencies (`firebase`, `recharts`, `@tanstack/react-query`, `react-day-picker`) and 22 unused UI primitive files

---

[1.0.0]: https://github.com/tanisheesh/Moodify/releases/tag/v1.0.0

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>

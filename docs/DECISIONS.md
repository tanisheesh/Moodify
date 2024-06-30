# Engineering Decisions — Moodify

---

## Decision 1 — Dynamic Groq Model Discovery & Fallback Chain over a Hardcoded Model Slug

**Context:** Cloud LLM providers periodically deprecate model identifiers (for example, retiring `llama-3.3-70b-versatile` in favor of newer model families like `openai/gpt-oss-120b` and `qwen/qwen3.8-27b`). A hardcoded model string causes immediate `404 model_not_found` failures in production.

**Decision:** Query `client.models.list()` at runtime and cascade across a prioritized candidate list (`process.env.GROQ_MODEL`, `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, `openai/gpt-oss-20b`, plus dynamically discovered chat models), automatically retrying on `404`, `429`, or `503`.

**Reason:** Guarantees zero downtime when Groq updates its active catalog or when a specific model hits per-minute rate limits.

---

## Decision 2 — Server-Side 4-Platform Exact Link Resolution over Client-Side `/search?q=` Links

**Context:** Linking "Listen" buttons to `/search?q=...` forces the user to manually pick a result and offers no album art or in-app audio playback.

**Decision:** Resolve every track and playlist server-side in parallel (`Promise.all`) across Spotify (`/v1/search`), YouTube Music (`WEB_REMIX`), JioSaavn (`search.getResults` + `song.generateAuthToken`), and iTunes (`itunes.apple.com/search`).

**Reason:** Delivers verified direct URLs (`open.spotify.com/track/{id}`, `music.youtube.com/watch?v={id}`, `jiosaavn.com/song/...`), official high-resolution cover art, and playable audio streams (`320kbps` JioSaavn AAC + `30s` iTunes/Spotify previews) in a single server round-trip.

---

## Decision 3 — YouTube Music `WEB_REMIX` Internal API over `www.youtube.com/results` HTML Scraping

**Context:** Converting a 47-track playlist requires resolving 47 YouTube Music track IDs. Scraping `www.youtube.com/results` downloads ~1.5 MB of HTML per track and triggers IP throttling after ~5 concurrent requests, leaving middle batches without YouTube Music links.

**Decision:** POST directly to `https://music.youtube.com/youtubei/v1/search?prettyPrint=false` with the `WEB_REMIX` client context and the official Songs filter (`params: "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D"`), falling back to unfiltered `WEB_REMIX` search when needed.

**Reason:** Reduces payload size by ~99% (~15 KB JSON vs. 1.5 MB HTML), eliminates batch throttling across 50-track conversions, and matches official YouTube Music audio tracks rather than random user-uploaded videos.

---

## Decision 4 — Server-Side `watch_videos` Redirect Inspection for Instant YouTube Music Playlists

**Context:** Creating a YouTube playlist via the YouTube Data API v3 requires Google OAuth verification and consumes 50 quota units per track (exhausting the 10,000 daily free quota after just 200 tracks).

**Decision:** Request `https://www.youtube.com/watch_videos?video_ids=...` server-side with `redirect: "manual"` and extract the generated `list=TLGG...` identifier from the `302 Location` header to construct `https://music.youtube.com/watch?v={firstId}&list={listId}`.

**Reason:** Generates a real, multi-track YouTube Music playlist URL for up to 50 tracks with zero OAuth friction and zero API quota cost.

---

## Decision 5 — JioSaavn `song.generateAuthToken` for In-App 320kbps Full-Track Queue Playback

**Context:** JioSaavn does not offer a public third-party OAuth API to write playlists into user accounts, and 30-second previews cut off full listening sessions.

**Decision:** Exchange each matched JioSaavn track's `encrypted_media_url` against `song.generateAuthToken` (`bitrate=320`) server-side and wire the signed `auth_url` into an in-app continuous queue player.

**Reason:** Lets users play their entire converted playlist full-length (`320kbps` AAC) with Next/Previous and seekbar controls directly inside Moodify.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>

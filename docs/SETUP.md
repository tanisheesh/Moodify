# Local Setup — Moodify

> **Just want to try it?** Use the live demo at [https://moodify.tanisheesh.in](https://moodify.tanisheesh.in) — no setup needed.  
> This guide is for running Moodify locally or self-hosting it.

---

## Prerequisites

- Node.js 20+
- pnpm (`corepack enable`)
- A Groq API key ([console.groq.com](https://console.groq.com))
- A Spotify Developer App Client ID & Secret ([developer.spotify.com/dashboard](https://developer.spotify.com/dashboard))

---

## 1. Clone and install

```bash
git clone https://github.com/tanisheesh/Moodify
cd Moodify
pnpm install
```

---

## 2. Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the values:

```env
GROQ_API_KEY=your_groq_api_key_here
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

| Variable | Required | Where to get it |
|---|---|---|
| `GROQ_API_KEY` | ✅ | [console.groq.com](https://console.groq.com) → API Keys → Create API Key |
| `SPOTIFY_CLIENT_ID` | ✅ | [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) → Basic Information |
| `SPOTIFY_CLIENT_SECRET` | ✅ | [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) → Basic Information → View client secret |

For local testing of **"Save to My Spotify"**, add `http://127.0.0.1:9002/api/spotify/callback` to your Spotify App's **Redirect URIs** in the Spotify Developer Dashboard.

---

## 3. Run locally

```bash
pnpm run dev
```

Moodify will be running at `http://localhost:9002` (or `http://127.0.0.1:9002` for Spotify OAuth callbacks).

---

## 4. Other scripts

```bash
pnpm run build      # Production build (runs strict TypeScript validation)
pnpm run start      # Start production server
pnpm run lint       # Next.js linter
pnpm run typecheck  # TypeScript type check (tsc --noEmit)
```

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>

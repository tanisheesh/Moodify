# Local Setup — Moodify

> **Just want to try it?** Use the live deployment at [https://moodify.tanisheesh.in](https://moodify.tanisheesh.in) — zero setup needed.  
> This guide covers running **Moodify** locally, configuring API keys, running verification checks, and fixing common local issues.

---

## Prerequisites & Versions

- **Node.js 22.x** (20+ supported; matches CI `NODE_DEFAULT_VERSION: "22"`)
- **pnpm** (`corepack enable` or `npm install -g pnpm`)
- A **Groq API key** ([console.groq.com](https://console.groq.com))
- A **Spotify Developer App** Client ID & Secret ([developer.spotify.com/dashboard](https://developer.spotify.com/dashboard))

---

## 1. Clone & Install

```bash
git clone https://github.com/tanisheesh/Moodify
cd Moodify
pnpm install --frozen-lockfile
```

*(Note: `pnpm-workspace.yaml` enables native builds for `sharp` used by Next.js image optimization.)*

---

## 2. Environment Variables

Copy `.env.example` to `.env.local` and populate your keys:

```bash
cp .env.example .env.local
```

| Variable | Type / Format | Required | Scope | Local Default / Source |
|---|---|---|---|---|
| `GROQ_API_KEY` | API key (`gsk_...`) | ✅ | Server-only | [console.groq.com](https://console.groq.com) → API Keys → Create API Key |
| `SPOTIFY_CLIENT_ID` | 32-char hex client ID | ✅ | Server-only | [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) → Basic Information |
| `SPOTIFY_CLIENT_SECRET` | 32-char hex secret | ✅ | Server-only | [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) → View client secret |
| `GROQ_MODEL` | Model slug override | ❌ | Server-only | Prepended ahead of `openai/gpt-oss-120b` in `src/lib/groq.ts` |
| `SPOTIFY_REDIRECT_URI` | Callback URL override | ❌ | Server-only | Defaults to `${origin}/api/spotify/callback` (`localhost` mapped to `127.0.0.1`) |

For local testing of **"Save to My Spotify"**, add `http://127.0.0.1:9002/api/spotify/callback` to your Spotify App's **Redirect URIs** in the Spotify Developer Dashboard.

> Never commit `.env` or `.env.local`, and never expose server secrets with `NEXT_PUBLIC_`.

---

## 3. Run Locally

Moodify has **no database, migrations, or seed script** — it runs completely statelessly.

```bash
pnpm run dev
```

App runs on `http://localhost:9002` (use `http://127.0.0.1:9002` when testing the Spotify OAuth popup flow).

---

## 4. Verification & Scripts

Run the exact verification checks enforced by CI before committing:

```bash
pnpm run typecheck   # tsc --noEmit
pnpm run build       # next build (production compilation & route validation)
pnpm run start       # Start production build locally on port 3000
```

*(Note: `lint` and `test` scripts are not yet configured in `package.json`; CI automatically executes `lint`, `format:check`, `typecheck`, `build`, `test`, and Playwright E2E once added.)*

If `coderabbit` CLI is installed locally, optionally review uncommitted changes:

```bash
coderabbit review --agent --uncommitted
```

---

## 5. Known Local-Only Limitations

- **Spotify OAuth host rule:** Spotify rejects `localhost` redirect URIs on newer apps; `/api/spotify/login` and `/api/spotify/callback` automatically normalize `localhost` to `127.0.0.1`. Start your browser session at `http://127.0.0.1:9002` so cookies and `window.opener` share the same origin.
- **Security headers:** Production HTTP security headers defined in `vercel.json` are applied at the Vercel edge, not by `next dev`.
- **Geo-dependent streams:** JioSaavn `320kbps` `auth_url` playback availability depends on regional CDN routing and catalog licensing for a given track.

---

## 6. Troubleshooting

| Symptom / Exact Error | Root Cause | Fix |
|---|---|---|
| `GROQ_API_KEY is not configured.` | Missing or empty `GROQ_API_KEY` in `.env.local` | Add valid key to `.env.local` and restart `pnpm run dev` |
| Spotify `INVALID_CLIENT: Invalid redirect URI` | Callback URI missing from Spotify Dashboard or started on `localhost` instead of `127.0.0.1` | Register `http://127.0.0.1:9002/api/spotify/callback` in Spotify Dashboard and open `http://127.0.0.1:9002` |
| `"Spotify playlist data not found"` or `"No tracks found"` | Playlist is private or an algorithmic personalized mix (`Discover Weekly` / `Daily Mix`) | Test with a public user/editorial playlist (e.g. one of the 4 sample chips in `Playlist Exporter`) |
| `"Could not parse Apple Music playlist tracks"` | Playlist URL is region-locked, malformed, or Apple markup omitted `serialized-server-data` | Verify URL resolves publicly on `music.apple.com` |
| `Ignored build scripts: sharp` during `pnpm install` | pnpm blocking postinstall scripts | `pnpm-workspace.yaml` already sets `allowBuilds.sharp: true`; re-run `pnpm install --frozen-lockfile` |

---

## 7. Deploy to Production

See [DEPLOY.md](DEPLOY.md) for Vercel hosting, custom domain wiring, security header verification, and incident runbooks.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>

# Deploying Moodify

> **Live:** [https://moodify.tanisheesh.in](https://moodify.tanisheesh.in) · **Host:** Vercel · **Auto-deploy:** on push to `main`

For local development, see [SETUP.md](SETUP.md).

---

## 1. Architecture in production

| Piece | Runs on | Notes |
|---|---|---|
| Web app & Server Actions | Vercel | Next.js 16 App Router, serverless functions |
| Spotify OAuth Routes | Vercel | `/api/spotify/login`, `/api/spotify/callback`, `/api/spotify/create-playlist` |
| DNS | GoDaddy | `moodify.tanisheesh.in` → CNAME to `cname.vercel-dns.com` |

---

## 2. Environment variables

Set these in the Vercel project dashboard (**Project → Settings → Environment Variables**). Names are in [`.env.example`](../.env.example).

| Variable | Required | Where it's set |
|---|---|---|
| `GROQ_API_KEY` | ✅ | Vercel → Project → Settings → Environment Variables |
| `SPOTIFY_CLIENT_ID` | ✅ | Vercel → Project → Settings → Environment Variables |
| `SPOTIFY_CLIENT_SECRET` | ✅ | Vercel → Project → Settings → Environment Variables |

> After changing an env var, **redeploy**. Running deployments don't pick up new values.

---

## 3. First-time deploy (Vercel)

1. [vercel.com/new](https://vercel.com/new) → import `tanisheesh/Moodify`
2. Framework preset: `Next.js` · Root directory: `./`
3. Add the env vars from section 2
4. Deploy. Every push to `main` now deploys to production, and every PR gets a preview URL.

---

## 4. Custom domain

`moodify.tanisheesh.in` is wired with the setup toolkit:

```powershell
.\scripts\setup-subdomain.ps1 -Subdomain "moodify" -Platform Vercel -VercelProject "moodify"
```

Manual fallback: add `moodify.tanisheesh.in` in the Vercel Domains dashboard, then create a GoDaddy CNAME `moodify` → `cname.vercel-dns.com`. HTTPS certificates are issued automatically once DNS resolves (2–10 min).

---

## 5. Verify a deploy

- [ ] `https://moodify.tanisheesh.in` loads with the splash screen and no console errors
- [ ] `01 · Mood Curation`: submitting a mood + genre returns 5 songs with real cover art, audio previews, and exact links (`Spotify`, `YT Music`, `JioSaavn`)
- [ ] `02 · Playlist Exporter`: pasting a Spotify, YouTube Music, JioSaavn, or Apple Music playlist URL converts up to 50 tracks and enables `Open YT Music Playlist` and `Play JioSaavn Playlist`

---

## 6. Rollback

| Host | How |
|---|---|
| Vercel | Dashboard → Deployments → pick the last good one → **Promote to Production** (or `vercel rollback`) |

After rolling back, note it in a commit or PR so the next push doesn't silently re-ship the broken version.

---

## 7. Monitoring & logs

- **Logs:** Vercel → Project → Logs
- **Dependencies:** Dependabot opens weekly update PRs and a maintenance report is generated every week (see `.github/workflows/`)

---

## Known production limitations

- **Spotify Development Mode OAuth:** Creating playlists in a user's Spotify account (`Save to My Spotify`) requires the user's Spotify email to be registered under **User Management** in the Spotify Developer Dashboard while the Spotify app is in Development Mode. Track/playlist matching (`client_credentials`) works for all visitors without restriction.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>

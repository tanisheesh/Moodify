# Deploying Moodify

> **Live:** [https://moodify.tanisheesh.in](https://moodify.tanisheesh.in) · **Host:** Vercel · **Auto-deploy:** on push to `main`

For local development, see [SETUP.md](SETUP.md).

---

## 1. Production Topology & Resource Limits

| Component | Host / Service | Region & Runtime | Configured Limits / Quotas |
|---|---|---|---|
| Web app, Server Actions & OAuth API routes | Vercel | Recommended `bom1` · Node.js `22.x` · Next.js 16 App Router | Serverless timeout bounded by upstream `2.5s–6.5s` `AbortSignal` caps; `vercel.json` edge headers |
| AI Curation & Title Cleaning | Groq Cloud | External HTTPS API (`openai/gpt-oss-120b` + 5-model cascade) | `10m` cached model catalog · auto-retry on `404`/`429`/`503` |
| Music Catalog Resolvers | Spotify Web API · YouTube Music `WEB_REMIX` · JioSaavn · iTunes | External HTTPS APIs | `24h` metadata cache (`86,400s`) · `1h` JioSaavn `320kbps` stream cache (`3,600s`) |
| DNS & TLS | GoDaddy → Vercel | `moodify.tanisheesh.in` | CNAME → `cname.vercel-dns.com` + automatic Vercel SSL |

---

## 2. Production Environment Variables

Configure all secrets in **Vercel → Project → Settings → Environment Variables** (never commit `.env*` files). Full key list is in [`.env.example`](../.env.example).

| Variable | Required | Host Location | Rotation / Sensitivity |
|---|---|---|---|
| `GROQ_API_KEY` | ✅ | Vercel → Env Vars (Production & Preview) | High — server-only, never `NEXT_PUBLIC_` |
| `SPOTIFY_CLIENT_ID` | ✅ | Vercel → Env Vars (Production & Preview) | Medium — server-only |
| `SPOTIFY_CLIENT_SECRET` | ✅ | Vercel → Env Vars (Production & Preview) | High — server-only |
| `GROQ_MODEL` | ❌ | Vercel → Env Vars (override primary model without deploy) | Low |
| `SPOTIFY_REDIRECT_URI` | ❌ | Vercel → Env Vars (set explicitly to `https://moodify.tanisheesh.in/api/spotify/callback` if locking production redirect) | Low |

In the **Spotify Developer Dashboard → Settings → Redirect URIs**, ensure `https://moodify.tanisheesh.in/api/spotify/callback` is registered.

> Changing an env var does **not** update running deployments — trigger a redeploy after editing env vars.

---

## 3. First-Time Deploy (Vercel)

1. [vercel.com/new](https://vercel.com/new) → import `tanisheesh/Moodify`.
2. Framework preset: `Next.js` · Install command: `pnpm install --frozen-lockfile` · Root directory: `./`.
3. Add the environment variables from Section 2 and deploy.
4. Apply production runtime, security & region settings via the setup toolkit:
   ```powershell
   ..\setup-toolkit\scripts\setup-vercel-project.ps1 -Project "moodify" -RepoPath . -Region "bom1" -IgnoreDocsOnlyBuilds
   ```

---

## 4. Custom Domain & Security Headers

`moodify.tanisheesh.in` is wired via:

```powershell
..\setup-toolkit\scripts\setup-subdomain.ps1 -Subdomain "moodify" -Platform Vercel -VercelProject "moodify"
```

- **Manual DNS fallback:** Add `moodify.tanisheesh.in` in the Vercel Domains dashboard, then set GoDaddy CNAME `moodify` → `cname.vercel-dns.com` (propagation 2–10 min; automatic TLS certificate).
- **Security headers (`vercel.json`):** Applies `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` across `/(.*)`.

---

## 5. Post-Deploy Smoke Verification

Run immediately after production deploys:

```bash
# 1. Landing page returns 200 and serves Moodify studio HTML
curl -fsS -o /dev/null -w "%{http_code}\n" https://moodify.tanisheesh.in

# 2. Verify security headers from vercel.json are active at the edge
curl -sI https://moodify.tanisheesh.in | grep -iE "x-frame-options|x-content-type-options|strict-transport-security|referrer-policy|permissions-policy"

# 3. Verify Spotify playlist creation fails closed (401) without OAuth session
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://moodify.tanisheesh.in/api/spotify/create-playlist -H "Content-Type: application/json" -d '{"uris":["spotify:track:123"]}'
```

Interactive checks:
- [ ] `https://moodify.tanisheesh.in` loads cleanly on mobile (`375px`) and desktop (`1280px`) with zero console errors
- [ ] `Mood Curation`: submitting a mood + genres returns 5 tracks with artwork, previews, and exact direct links (`Spotify`, `YT Music`, `JioSaavn`)
- [ ] `Playlist Exporter`: testing one of the 4 sample playlists matches tracks and enables `Open YT Music Playlist` and `Play JioSaavn Playlist`

---

## 6. Rollback Procedure

| Layer | Rollback Action |
|---|---|
| **Vercel** | Dashboard → Deployments → select last verified production deploy → **Promote to Production** (or `vercel rollback`) |

> Always record any manual rollback (target SHA and reason) in a commit or PR so the next push to `main` does not silently re-deploy the broken commit.

---

## 7. Incident & Quota Runbooks

| Incident | Immediate Action |
|---|---|
| **Groq `404` / `429` / `503` spike** | Verify fallback chain logs; set `GROQ_MODEL` env var on Vercel to an active unthrottled model (e.g. `qwen/qwen3.8-27b` or `openai/gpt-oss-20b`) and redeploy |
| **Spotify `Save to My Spotify` fails (`403` / redirect error)** | Verify user's Spotify email is allowlisted under Spotify Dashboard → **User Management** (required in Development Mode) and confirm `https://moodify.tanisheesh.in/api/spotify/callback` is registered |
| **Upstream playlist importer breaks (Spotify embed / YT `WEB_REMIX` / Apple `serialized-server-data`)** | Check Vercel Logs for parser error message; inspect upstream response markup/JSON shape and patch the isolated importer in `src/lib/playlist-converter.ts` |
| **Suspected secret leak** | Revoke `GROQ_API_KEY` or rotate `SPOTIFY_CLIENT_SECRET` immediately in vendor dashboard → update Vercel env vars → redeploy → confirm Gitleaks & Secret Scanning pass |

---

## 8. Monitoring & Automated Maintenance

- **Logs:** Vercel → Project → Logs
- **Automated Hygiene:** Renovate (`Yantra [bot]`), CodeQL, Gitleaks secret scanning, PR Dependency Review, and weekly Maintenance Report run via `.github/workflows/`.

---

## Known Production Limitations

- **Spotify Development Mode OAuth:** Creating playlists in a user's Spotify account (`Save to My Spotify`) requires the user's Spotify email to be registered under **User Management** in the Spotify Developer Dashboard while the Spotify app is in Development Mode. Track/playlist matching (`client_credentials`) works for all visitors without restriction.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>

# Moodify — Agent Development Guidelines

Follow these rules strictly on every file you create or modify in **Moodify**.

---

## 1. File Organization & Architecture

- **File naming:**
  - TypeScript / JavaScript: ALWAYS use `kebab-case` (`music-platforms.ts`, `playlist-converter.ts`, `save-to-spotify-button.tsx`), except Next.js App Router files (`page.tsx`, `layout.tsx`, `route.ts`, `actions.ts`, `opengraph-image.tsx`, `twitter-image.tsx`, `sitemap.ts`, `robots.ts`, `manifest.ts`).
- **File size limit:** Keep files focused and **under 300 lines**. When a page, component, or library module approaches 300 lines, split it into cohesive submodules (`src/components/`, `src/hooks/`, `src/lib/`).
- **Layered separation:**
  - `src/components/ui/` — pure, domain-agnostic UI primitives (`Button`, `Input`, `Textarea`, `Alert`, `Toast`). No `fetch()`, Server Actions, or business logic inside `ui/`.
  - `src/components/` — product feature components composed from `ui/` primitives (`genre-selector.tsx`, `llm-recommendation-card.tsx`, `playlist-converter.tsx`).
  - `src/hooks/` — reusable client hooks (`use-toast.ts`).
  - `src/lib/` & `src/ai/flows/` — server-only business logic, Groq orchestration, 4-platform catalog resolvers, playlist importers, and Zod schemas (`import "server-only"` / `"use server"`).
  - `src/app/` — thin App Router pages, Server Actions (`actions.ts`, `converter-actions.ts`), and Route Handlers (`/api/spotify/*`): validate input → call `src/lib/` or `src/ai/` → return typed response.
- **Reusability (Rule of Two):** Extract any repeated UI pattern, helper, or fetch wrapper used 2+ times into `src/components/ui/`, `src/hooks/`, or `src/lib/`. Prefer props composition over boolean flag explosion.
- **App Router only (Next.js):** Never create or expand `pages/`. Always use `src/app/`.

---

## 2. Code Style & Strictness

- **No dead code or debug clutter:** Never leave unused imports, commented-out blocks, or stray `console.log` statements.
- **Named exports at definition:** Prefer `export async function foo()` / `export function bar()` at definition point. Only use `export default` where Next.js requires it (`page.tsx`, `layout.tsx`, `opengraph-image.tsx`, `sitemap.ts`, `robots.ts`, `manifest.ts`, `next.config.ts`).
- **Control flow & async:** Use `async/await` (no raw `.then()` chains or nested callbacks). Prefer early returns with `if/else` and lookup maps over sprawling `switch` blocks. Use `for...of` for sequential async iteration (`Array.prototype.forEach` does not await).
- **Strict equality:** Always use `===` and `!==` (never `==` / `!=`).
- **Type safety:** NEVER use `@ts-ignore`, `@ts-expect-error`, or `@ts-nocheck`. Avoid `any` — use `unknown` + Zod or explicit type-guard narrowing. Share canonical interfaces in `src/types/music.ts` or derive types from Zod schemas (`z.infer<typeof ...>`).
- **Error handling:** Let pure helpers throw descriptive `Error` instances. Catch explicitly at Server Actions, Route Handlers, external API resolvers, and UI boundaries — NEVER leave empty or silent `catch {}` blocks without documented fallback reasoning.
- **Directives first:** In files needing `"use client"` or `"use server"`, put the directive on **line 1** before any imports or comments.

---

## 3. UI Craft & Anti-AI-Slop Rules

- **Banned clichés:**
  - No generic purple/indigo/pink linear gradients, neon box-shadow glows, or rainbow badge spam.
  - No cookie-cutter 3-column icon-in-circle marketing grids inside the studio workspace.
  - No emoji-prefixed app UI headings (`🚀`, `✨`), hype copy (*"Supercharge..."*), or hardcoded fake telemetry.
  - No dead buttons (`onClick={() => {}}`) or `window.alert()` / `window.confirm()`.
- **Design discipline:** Stick to the studio palette (`#09090b` canvas, `#E11D48` rose primary accent, crisp `border-white/[0.08]` 1px borders, Geist Sans + Geist Mono), consistent `lucide-react` icons, and `tabular-nums` / monospace alignment on indices and audio timers.
- **Mandatory 4 states:** Every async view (mood results, playlist conversion table, Spotify export) must handle **Loading** (`LoadingAnimation`), **Empty** (guided prompts / sample chips), **Error** (actionable toast / alert banner), and **Populated**.
- **Accessibility & responsiveness:** Semantic HTML (`<button>`, `<label>`, `<main>`, `<nav>`), visible `focus-visible` rings, WCAG AA contrast, zero horizontal scroll across mobile (`375px`) and desktop (`1280px`), and synchronized single-source audio playback via `broadcastAudioPlay`.

---

## 4. Security Rules

- **Boundary validation:** Validate every Server Action (`FormData`), Route Handler JSON body (`/api/spotify/create-playlist`), and external LLM output with **Zod** before acting on it.
- **Auth & OAuth hygiene:** Store user Spotify OAuth tokens in `httpOnly`, `sameSite: "lax"` cookies (`moodify_sp_user_token`), verify `window.opener.postMessage` origins cleanly, and fail closed (`401`) when unauthenticated.
- **Secrets isolation:** Keep `GROQ_API_KEY`, `SPOTIFY_CLIENT_ID`, and `SPOTIFY_CLIENT_SECRET` strictly server-side (`"server-only"` / `"use server"`). NEVER prefix server secrets with `NEXT_PUBLIC_`. Never commit `.env*` files; document new keys in `.env.example` with empty values. Never log tokens or cookies.
- **SSRF & URL allowlisting:** When accepting user-supplied playlist URLs, strictly validate `https:` protocol and exact hostname allowlists (not loose substring `.includes()`) before server-side fetching.
- **LLM safety:** Keep system curation instructions separated from user mood text, bound retries to known retriable statuses (`404`, `429`, `503`), and validate/normalize every LLM JSON response with Zod before enriching or rendering.
- **HTTP headers:** Keep security headers enforced in `vercel.json` (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`).

---

## 5. Testing & Verification

- **No work is complete without verification:**
  - Pure helpers (`playlist-converter.ts`, `utils.ts`, `groq.ts` parsers) → unit tests covering happy paths + null/empty/malformed inputs.
  - Route handlers & Server Actions (`/api/spotify/*`, `actions.ts`, `converter-actions.ts`) → integration tests covering `200`/`400`/`401` and mocked upstream timeouts.
  - Bugfixes → regression test reproducing the failure before fixing.
  - UI changes → verify mobile (`375px`) & desktop (`1280px`), zero console/page errors, and Playwright + `@axe-core/playwright` checks when configured.
- **Never bypass checks:** Never delete tests, add `.skip`, or weaken TypeScript/lint rules to force green CI.

### Verification Commands (Run Before Finishing)

```bash
pnpm run typecheck   # tsc --noEmit
pnpm run build       # next build (runs Next.js compilation & route/type checks)
```

*(Note: `lint` and `test` scripts are not yet defined in `package.json`; CI automatically executes `lint`, `format:check`, `typecheck`, `build`, `test`, and Playwright E2E once added.)*

If `coderabbit` CLI is installed locally, optionally run a pre-PR review on your changes:

```bash
coderabbit review --agent --uncommitted   # or --base main --gate major
```

---

## 6. Git & Commit Rules

- **Atomic commits:** `<emoji> [#issue] [scope:] <present tense lowercase message>` (see `CONTRIBUTING.md`).
- **PRs:** Use plain-English **past-tense** PR titles, fill the PR template, and include docs / `.env.example` / tests in the same PR.
- **Safety:** Never force-push or run `git reset --hard` on `main`. Record any production rollback SHA and reason in a commit or PR.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>

# Local Setup — Moodify

> **Just want to try it?** Use the live demo at [moodify.tanisheesh.in](https://moodify.tanisheesh.in) — no setup needed.
> This guide is for running Moodify locally or self-hosting it.

---

## Prerequisites

- Node.js 20+
- npm (bundled with Node.js)
- A Groq API key (free tier is sufficient — get one at [console.groq.com](https://console.groq.com))

---

## 1. Clone and install

```bash
git clone https://github.com/tanisheesh/Moodify
cd Moodify
npm install
```

---

## 2. Environment variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local   # if .env.example exists, otherwise create manually
```

Then add the following:

```env
GROQ_API_KEY=your_groq_api_key_here
```

| Variable | Where to get it |
|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys → Create API Key |

This is the only required environment variable. The app has no database and no other external service dependencies.

---

## 3. Run locally

```bash
npm run dev
```

Moodify will be running at `http://localhost:9002`.

The dev server uses Turbopack (`next dev --turbopack -p 9002`) for faster builds.

---

## 4. Other scripts

```bash
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
npm run typecheck  # TypeScript type check (tsc --noEmit)
```

---

## 5. Deploy to production

Moodify deploys to Vercel in one step:

1. Push the repo to GitHub.
2. Import the project in the [Vercel dashboard](https://vercel.com/new).
3. Add `GROQ_API_KEY` as an environment variable in the Vercel project settings.
4. Deploy. No build configuration changes are needed — `next build` is the entire build step.

Auto-deploy on push to `main` is enabled by default after the initial import.

---

## Known local-only limitations

- The dev server runs on port **9002** (not 3000) — update any saved bookmarks accordingly.
- `typescript: { ignoreBuildErrors: true }` is set in `next.config.ts`, so TypeScript errors won't block the build locally or in production. Run `npm run typecheck` separately to surface type issues.

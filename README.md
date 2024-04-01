<p align="center">
  <img src="src/app/favicon.ico" width="64" height="64" alt="Moodify logo">
</p>

<h1 align="center">Moodify</h1>

<p align="center">
  <strong>Describe how you feel — get an AI-curated playlist in seconds.</strong>
</p>

<p align="center">
  <a href="https://moodify.tanisheesh.in">
    <img src="https://img.shields.io/badge/live_demo-E11D48-E11D48?style=flat-square" alt="Live Demo">
  </a>
  <img src="https://img.shields.io/badge/Next.js-black?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Groq-F55036?style=flat-square" alt="Groq">
  <img src="https://img.shields.io/badge/license-GPL--3.0-E11D48?style=flat-square" alt="License">
</p>

---

## What is Moodify?

Streaming platforms surface playlists built from your listening history — not from how you feel *right now*. Moodify closes that gap: type a sentence about your current mood, pick your preferred genres and language, and get back 5 song recommendations and 2 playlist themes tailored to that exact emotional state, powered by Groq's Llama 3.3-70b. No account, no friction, no waiting — just instant, explainable music suggestions.

> **Live demo →** [moodify.tanisheesh.in](https://moodify.tanisheesh.in)

---

## What you get

- **Natural-language mood input** — Describe your vibe in any language; the model handles the interpretation.
- **Genre filtering** — Choose from 126 genre options (18 shown by default, "Show More" expands to all) to keep results within music you actually like.
- **AI mood analysis** — A brief explanation of why those songs were chosen, rendered with a character-by-character typing animation.
- **Instant YouTube Music links** — Every song and playlist card links directly to a YouTube Music search — no copy-pasting, no platform OAuth required.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| AI | Groq API — Llama 3.3-70b-versatile (JSON mode) |
| Styling | Tailwind CSS 3 · shadcn/ui (Radix UI primitives) |
| Validation | Zod 3 |
| Fonts | Geist Sans + Geist Mono |
| Hosting | Vercel |

No database. No auth. Fully stateless.

---

## Engineering Decisions

**Why Groq over OpenAI or the Anthropic API?**
Groq's free tier provides fast inference on Llama 3.3-70b with no billing setup — ideal for a portfolio demo that needs to stay live without cost management. The model quality is more than sufficient for music-genre matching.

**Why Server Actions over a REST API layer?**
A single Server Action (`fetchRecommendations`) handles validation and the Groq call with zero extra routing boilerplate. Colocating server logic with the UI page reduces surface area and keeps the project easy to reason about.

**Why stateless — no database?**
Music recommendations are inherently ephemeral. Skipping persistence cuts the deployment to a single Vercel project with one env var. A database becomes worthwhile only when history or accounts are added in v2.

**Why Zod validation on the AI response?**
Even with `response_format: json_object` set, the model can return wrong array lengths or missing fields. Strict Zod parsing catches malformed output before it reaches the client, surfacing a clear error instead of a broken card grid.

**What would you do differently in v2?**
Remove `typescript: { ignoreBuildErrors: true }` from `next.config.ts` and fix the underlying type errors properly. Add per-IP rate limiting on the Server Action to protect Groq quota under demo traffic spikes.

---

## Docs

| Document | Description |
|---|---|
| [PRD](docs/PRD.md) | Product requirements — goals, user stories, non-goals |
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, component breakdown |
| [Decisions](docs/DECISIONS.md) | Every major technical decision and why |
| [Setup](docs/SETUP.md) | Local dev setup, env vars, deployment |

---

## Author

**Tanish Poddar** — [tanisheesh.in](https://tanisheesh.in) · [LinkedIn](https://linkedin.com/in/tanisheesh) · [GitHub](https://github.com/tanisheesh)

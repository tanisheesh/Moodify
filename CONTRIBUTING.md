# Contributing to Moodify

Thanks for taking the time to contribute! Bug reports, fixes, docs improvements and feature ideas are all welcome.

---

## Before you start

- **Found a bug?** Open a [bug report](../../issues/new?template=bug_report.yml). Search existing issues first.
- **Have an idea?** Open a [feature request](../../issues/new?template=feature_request.yml) before writing code, so we can agree on the approach.
- **Found a security issue?** Don't open a public issue. Follow [SECURITY.md](SECURITY.md).
- Small fixes (typos, docs, obvious bugs) can go straight to a pull request.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Local setup

Full instructions are in [docs/SETUP.md](docs/SETUP.md). Short version:

```bash
git clone https://github.com/tanisheesh/Moodify   # or your fork
cd Moodify
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm run dev
```

---

## Workflow

1. **Fork** the repo and create a branch from `main`:

   | Branch prefix | Use for |
   |---|---|
   | `feat/` | new feature, e.g. `feat/sse-playlist-progress` |
   | `fix/` | bug fix, e.g. `fix/youtube-song-match` |
   | `docs/` | documentation only |
   | `chore/` | tooling, config, dependencies |
   | `refactor/` | code change with no behaviour change |

2. **Make your change.** Keep it focused, one feature or fix per PR, and follow [`AGENTS.md`](AGENTS.md).
3. **Check it locally** before pushing:

   ```bash
   pnpm run typecheck && pnpm run build
   ```

4. **Open a pull request** against `main`. Use a clean **past-tense** PR title (e.g. `Added dynamic OpenGraph metadata and synchronized audio playback`). The PR template will guide you.

---

## Commit messages

Commits follow an emoji-prefixed format:

```
<emoji> [#issue] [scope:] <message in present tense, lowercase>
```

| Emoji | Type | Example |
|---|---|---|
| ✨ | New feature | `✨ add 4-platform playlist converter and exporter` |
| 🐛 | Bug fix | `🐛 youtube: use web_remix song filter for exact track ids` |
| 🎊 | Improvement | `🎊 make song cards and exporter responsive across mobile viewports` |
| ♻️ | Refactor | `♻️ extract multi-platform resolver into music-platforms module` |
| 📚 | Docs | `📚 add deploy guide and update architecture` |
| 🧪 | Tests | `🧪 cover playlist url platform detection` |
| 🔨 | Chore / config | `🔨 configure pnpm allowBuilds for sharp` |
| 👆 | Dependency update | `👆 upgrade react and react-dom to 19` |
| 🔒 | Security | `🔒 store spotify oauth token in httponly cookie` |
| 💀 | Code deletion | `💀 remove unused ui primitives and radix dependencies` |

Breaking changes add a line `🚨 BREAKING CHANGE: <what breaks>` in the commit body.

---

## Code style

- Follow [`AGENTS.md`](AGENTS.md) rules strictly (files under ~300 lines, `kebab-case` filenames, `camelCase` variables/functions, Next.js App Router `src/app/`).
- Run `pnpm run typecheck` and `pnpm run build` before committing. CI runs the same checks (plus `lint` / `test` as added).
- No secrets in code. Use env vars and add new keys to `.env.example` with empty values.
- Update `docs/` and `CHANGELOG.md` when behaviour, setup or env vars change.

---

## Pull request checklist

- [ ] Branch is up to date with `main`
- [ ] Typecheck and build pass locally (and tests when added)
- [ ] Commits follow the format above; PR title uses clean past-tense English
- [ ] Docs / `.env.example` / `CHANGELOG.md` updated if needed
- [ ] PR description explains **what** and **why**

PRs are reviewed as soon as possible. Feedback is about the code, never the person.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>

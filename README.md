# Cueline

**Guests in. Cues out.**
A guest-first celebration planner that turns *who's coming* into quantities, seating, accessibility,
prep tasks, helper assignments — and a live run sheet that re-plans itself when the day runs late.

🔗 **Live:** _deployment link added after Cloudflare deploy_ · 🎥 **Demo video:** _added at submission_ · 📄 **Docs:** [`/docs`](docs)

> Try it in 30 seconds: open the app → **Load demo: Grandpa’s 75th** → Guests → Plan → Run sheet →
> **Live** → set the rehearsal clock to 12:40 → **Custom delay 25** (the cake is late) → pick a
> recovery option that keeps the seniors’ lunch on time.

---

## The problem
Gatherings are planned around budgets and themes, but they succeed or fail on people: grandparents
who must eat on time, a guest in a wheelchair, toddlers who nap at 3, vegetarian and diabetic
guests, cousins flying in. Organizers juggle all of this with volunteer helpers — and then the day
runs late and nobody knows what to cut.

**Who it's for:** family & community organizers (20–200 guests, mixed ages, volunteer helpers,
no professional planner).

## What it does
| | Feature |
|---|---|
| 🗣 | **Adaptive intake** — asks only what matters next; captures your priority weights |
| 👥 | **Guest Lens** — paste a messy guest list; AI finds need groups (age, diet, mobility, travel) |
| 🍽 | **Needs → Plan** — food quantities, menu coverage, seating zones, accessibility checklist, budget |
| ✅ | **RSVP tracker** — every reply updates quantities, tables and budget instantly |
| 🗓 | **Prep timeline** — tasks with dependencies, critical path, "do this next" |
| 🤝 | **Helpers & vendors** — helper briefs, shareable cue cards, need-driven vendor questions, quote log |
| ⏱ | **Run sheet + Live mode** — when the day runs late, ranked recovery options that protect guest needs |
| 🕘 | **Versions & export** — restore any version, print cue sheets, `.ics` deadlines |

## How GenAI is used (and where it isn't)
| Gemini does | Deterministic code does |
|---|---|
| Understands free-text guest notes → structured needs with confidence | All quantities, seat counts, totals, per-guest cost |
| Chooses the next intake question | Budget allocation from priority weights |
| Drafts prep tasks, run sheets, accessibility items | Scheduling, dependencies, critical path |
| Writes helper briefs, invites, vendor questions | Delay shifting and constraint checks |
| Proposes recovery options on the day | Validating and ranking those options |

- Every money line is labelled **Estimate**, **Quote** or **Confirmed** — AI can only ever produce estimates.
- Gemini returns **schema-constrained JSON**, validated again with zod before anything renders.
- Guest names are **pseudonymized** in the browser before any AI call.
- Prompts and their evolution: [`docs/AI_PROMPTS.md`](docs/AI_PROMPTS.md).

## Architecture
React SPA (Vite, TypeScript) on **Cloudflare Pages**, with one **Pages Function** (`/api/ai`) that
holds the Gemini key as a secret and only accepts named tasks. All state lives in the browser
(localStorage). Details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

```
src/engine/    pure planning maths (quantities, seating, budget, schedule, live shift, recovery, ics)
src/shared/    zod schemas + AI task contracts, shared by the browser and the proxy
src/ai/        typed AI client, SHA-256 cache, offline fallbacks, useAi hook
src/features/  one folder per screen: intake, guests, plan, timeline, vendors, helpers,
               runsheet, live, versions, export
functions/api/ the only code that talks to Gemini (guards, task registry, prompts)
```

## Quality
- **Security:** key server-side only; the proxy accepts 9 named tasks, never raw prompts; origin
  allowlist, 32 KB cap, per-IP rate limit, generic errors, `no-store`; CSP & security headers;
  guest and helper names pseudonymized before any AI call; no unsafe HTML; `npm audit --omit=dev`
  clean — [`docs/SECURITY.md`](docs/SECURITY.md)
- **Testing:** 259 tests (Vitest + Testing Library + vitest-axe). Coverage: 98.8 % lines,
  88.8 % branches, 86.9 % functions overall; **engine 100 % lines**, proxy 100 % lines.
  Every screen has an axe test with zero violations — [`docs/TESTING.md`](docs/TESTING.md)
- **Accessibility:** WCAG 2.2 AA target: landmarks, skip link, focus moved to each page's h1,
  ARIA tabs and radio groups, live-region announcements (assertive for Live-mode conflicts),
  icon + text statuses, keyboard alternative to drag, shortcuts dialog (`?`) that can be turned
  off, high-contrast Live mode — [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md)
- **Efficiency:** lazy routes (Live mode is its own ~5 KB chunk), **100 KB gzip initial JS**,
  memoized engine selectors (200-guest recompute < 50 ms, tested), cached AI responses,
  aborted superseded requests

## Run locally
```bash
git clone <repo> && cd cueline
npm install
npm run dev                      # UI only on :5173 (AI features fall back gracefully)

cp .dev.vars.example .dev.vars   # add your Gemini key + model (never committed)
npm run dev:full                 # build + UI and /api/ai on http://localhost:8788

npm run lint && npm run typecheck && npm run test && npm run build
npm run coverage                 # enforces the thresholds in vitest.config.ts
```
Deploy: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) · Build log & decisions: [`docs/PROGRESS.md`](docs/PROGRESS.md)

## Out of scope
Payments, a real vendor marketplace, accounts/multi-device sync, sending SMS/email (Cueline produces
the text for you to send). Prices and vendor availability are never asserted — only what you enter.

## Built with
React · TypeScript · Vite · Tailwind · Zustand · zod · Cloudflare Pages & Functions · Google Gemini ·
Vitest · Testing Library · axe — developed with prompt-driven development in Claude Code.

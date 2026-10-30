# Cueline

**Guests in. Cues out.**
A guest-first celebration planner that turns *who's coming* into quantities, seating, accessibility,
prep tasks, helper assignments — and a live run sheet that re-plans itself when the day runs late.

🔗 **Live:** `<your-project>.pages.dev` · 🎥 **Demo video:** `<link>` · 📄 **Docs:** [`/docs`](docs)

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

## Quality
- **Security:** key server-side only, origin/size/rate guards, CSP & security headers, no unsafe HTML — [`docs/SECURITY.md`](docs/SECURITY.md)
- **Testing:** Vitest + Testing Library + axe; engine coverage ≥ 95 % — [`docs/TESTING.md`](docs/TESTING.md)
- **Accessibility:** WCAG 2.2 AA target, full keyboard support, screen-reader announcements — [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md)
- **Efficiency:** lazy routes, cached/de-duplicated AI calls, < 150 KB initial JS

## Run locally
```bash
git clone <repo> && cd cueline
cp .dev.vars.example .dev.vars   # add your Gemini key (never committed)
npm install
npm run dev:full                 # http://localhost:8788
npm run test                     # tests
```
Deploy: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## Out of scope
Payments, a real vendor marketplace, accounts/multi-device sync, sending SMS/email (Cueline produces
the text for you to send). Prices and vendor availability are never asserted — only what you enter.

## Built with
React · TypeScript · Vite · Tailwind · Zustand · zod · Cloudflare Pages & Functions · Google Gemini ·
Vitest · Testing Library · axe — developed with prompt-driven development in Claude Code.

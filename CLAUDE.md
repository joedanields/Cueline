# CLAUDE.md — Working agreement for Claude Code

You are building **Cueline**: a guest-first celebration planner that carries the organizer from
"who's coming" all the way to a live, self-adjusting event-day run sheet.

Read these before writing code, in this order:
1. `docs/PRD.md` — what we are building and why (acceptance criteria live here)
2. `docs/ARCHITECTURE.md` — folders, data flow, boundaries
3. `docs/DATA_MODEL.md` — types + zod schemas (source of truth for all shapes)
4. `docs/AI_PROMPTS.md` — every Gemini task, its prompt and response schema
5. `docs/BUILD_PLAN.md` — the phase you are currently on

Supporting: `docs/SECURITY.md`, `docs/TESTING.md`, `docs/ACCESSIBILITY.md`, `docs/DEPLOYMENT.md`.

---

## Evaluation context (why the rules below exist)

The project is scored automatically on: **Problem-statement alignment (most important), Code quality,
Security, Efficiency, Testing, Accessibility**. Every rule below maps to one of these. Do not trade
any of them away for speed.

---

## Stack (do not change without asking)

| Concern | Choice |
|---|---|
| Build | Vite + React 18 + TypeScript (strict) |
| Styling | Tailwind CSS (design tokens in `tailwind.config.ts`) |
| State | Zustand with `persist` middleware → localStorage |
| Validation | zod (all AI responses, all persisted state on load, all proxy input) |
| Routing | React Router (lazy-loaded routes) |
| AI | Google Gemini REST API, called **only** from `functions/api/ai.ts` |
| Hosting | Cloudflare Pages (static `dist/`) + Pages Functions (`functions/`) |
| Tests | Vitest, @testing-library/react, @testing-library/user-event, vitest-axe |
| Lint/format | ESLint (typescript-eslint, jsx-a11y, react-hooks), Prettier |
| Dates | date-fns (no moment) |

Keep dependencies minimal. Ask before adding any dependency not listed here.

---

## Non-negotiable rules

### 1. AI handles language, code handles numbers
- Gemini **never** computes quantities, costs, totals, times, or durations that the UI displays as fact.
- Gemini may propose *structure* (groups, tasks, run-sheet segments, recovery options) and *words*
  (briefs, invites, checklist wording). All arithmetic lives in `src/engine/` as pure functions.
- Every money value shows a `source` badge: `estimate` (assumption), `quote` (vendor quoted),
  `confirmed`. Gemini output can only ever produce `estimate`.
- Never let Gemini state vendor availability or real prices as fact.

### 2. The API key never reaches the browser
- `GEMINI_API_KEY` exists only as a Cloudflare secret (prod) and in `.dev.vars` (local, gitignored).
- No `VITE_` prefixed secret. Grep for the key name in `src/` must return nothing.
- The browser calls `POST /api/ai` with `{ task, input }`. The function picks the prompt. The
  browser never sends a raw prompt.

### 3. Guest privacy
- Guest names are replaced with stable IDs (`g_001`) by `src/lib/pseudonymize.ts` before any text
  is sent to `/api/ai`. Names are re-attached client-side from the store.

### 4. Validate at every boundary
- Proxy validates request body with zod → 400 on failure.
- Client validates every AI response with the matching zod schema → on failure show a friendly
  retry state; never render unvalidated AI data.
- Persisted store is validated on hydrate; corrupt state → reset with a toast, never crash.

### 5. Pure engine, thin components
- `src/engine/*` = pure TS, no React, no I/O, 100% deterministic, fully unit-tested.
- Components render and dispatch. Business logic in components is a code-review failure.
- Files ≤ ~200 lines; functions ≤ ~40 lines. Split when larger.

### 6. Accessibility is part of "done"
- Every interactive element reachable and operable by keyboard with visible focus.
- Every new screen gets a `vitest-axe` test with zero violations.
- AI loading/results and live-mode schedule shifts are announced via the shared `LiveRegion`.
- See `docs/ACCESSIBILITY.md` for the full checklist.

### 7. No unsafe rendering
- Never use `dangerouslySetInnerHTML`. AI text is rendered as plain text.
- No `eval`, no `new Function`, no inline event-handler strings.

---

## Code conventions

- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`. No `any`; use `unknown` + zod.
- Named exports only (except route components loaded via `lazy`).
- Types derive from zod: `export type Guest = z.infer<typeof GuestSchema>`.
- Money stored as **integer minor units** (cents/paise) + ISO currency code. Never floats.
- Times stored as ISO strings; durations as integer minutes.
- Naming: `camelCase` functions, `PascalCase` components/types, `SCREAMING_SNAKE` constants.
- Comments explain *why*, not *what*. Every engine function has a JSDoc with an example.
- No `console.log` in committed code (use `src/lib/logger.ts`, silent in prod).
- No magic numbers in engine code — put them in `src/engine/constants.ts` with a comment citing the
  assumption (e.g. "adult portion of mains ≈ 350 g — planning heuristic, editable").

## Commands

```bash
npm run dev          # Vite dev server (UI only; AI calls go to wrangler)
npm run dev:full     # build + wrangler pages dev dist — UI + /api/ai with .dev.vars on :8788
npm run build        # typecheck + vite build
npm run test         # vitest run
npm run test:watch
npm run coverage     # must meet thresholds in vitest.config.ts
npm run lint
npm run typecheck
```

## Definition of done (every PR / phase)

- [ ] `npm run lint && npm run typecheck && npm run test && npm run build` all pass
- [ ] New engine logic has unit tests incl. edge cases
- [ ] New screen has an axe test and keyboard test
- [ ] No secrets, no `console.log`, no `any`
- [ ] Relevant doc in `docs/` updated if behaviour changed
- [ ] Repo still < 10 MB (`du -sh --exclude=node_modules --exclude=.git .`)

## When unsure

Prefer asking over guessing for: new dependencies, changes to data model, changes to AI task list.
For everything else, follow the docs and keep going.

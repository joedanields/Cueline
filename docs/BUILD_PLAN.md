# Build plan — Cueline

Work phase by phase. Paste each **Prompt** into Claude Code. Do not start the next phase until the
**Checkpoint** passes. Commit at the end of every phase with the given message.

> Tip: start every Claude Code session with: *"Read CLAUDE.md and docs/BUILD_PLAN.md. We are on Phase N."*

---

## Phase 0 — Scaffold & tooling
**Prompt**
```
Read CLAUDE.md and docs/ARCHITECTURE.md. Scaffold the project exactly as described:
Vite + React + TS strict, Tailwind, Zustand, zod, React Router, date-fns, Vitest + Testing Library +
user-event + vitest-axe + jsdom, ESLint (typescript-eslint, jsx-a11y, react-hooks, react/no-danger,
no-eval) + Prettier. Create the folder structure with placeholder index files, package.json scripts
from CLAUDE.md (dev:full uses `wrangler pages dev -- npm run dev`), vitest.config.ts with coverage
thresholds from docs/TESTING.md, tests/setup.ts that fails on unmocked fetch, .gitignore,
.env.example, .dev.vars.example, public/_headers (from SECURITY.md), public/_redirects.
Add an App shell with header/nav/main/footer landmarks, skip link, route focus management,
and one smoke + axe test. Do not build features yet.
```
**Checkpoint:** lint, typecheck, test, build all green. `du -sh` excluding node_modules < 2 MB.
**Commit:** `chore: scaffold Cueline with tooling, a11y shell and security headers`

## Phase 1 — Shared schemas & store
**Prompt**
```
Implement every schema in docs/DATA_MODEL.md under src/shared/schemas with inferred types.
Add tests with valid/invalid fixtures for each. Build the Zustand store with slices
(plan, guest, budget, vendor, helper, task, runSheet, checklist, version), persist with
schemaVersion + hydrate validation (reset + toast on failure), and a "Delete all my data" action.
Add src/data/demo.ts implementing the demo scenario from docs/PRD.md §5 and a "Load demo" action.
```
**Checkpoint:** schema tests pass; corrupting localStorage in a test triggers safe reset.
**Commit:** `feat: data model, validated persistent store and demo scenario`

## Phase 2 — Engine (pure, test-first)
**Prompt**
```
Implement src/engine/* from docs/ARCHITECTURE.md and DATA_MODEL.md, TEST-FIRST, using the required
cases in docs/TESTING.md: constants, rsvp (headcount), quantities, menuCoverage, seating, budget
(integer minor units, allocation by weights, never overwrite quote/confirmed), schedule (backward
scheduling, cycle detection, critical path, slips), doNext, runSheet validation, liveShift,
recovery (validate ops, rank per DATA_MODEL formula, deterministic fallback), ics.
Every exported function has JSDoc with an example. No React, no Date.now() — inject `now`.
Add store selectors that memoize engine output.
```
**Checkpoint:** engine coverage ≥ 95 %; 200-guest perf test < 50 ms.
**Commit:** `feat(engine): deterministic planning engine with full test coverage`

## Phase 3 — AI proxy (Pages Function)
**Prompt**
```
Implement functions/api/ai.ts and functions/api/_lib/* per docs/AI_PROMPTS.md and docs/SECURITY.md:
guards (method, content-type, origin allowlist, 32 KB cap, per-IP token bucket), task registry
for all 9 tasks with input zod schemas, prompt builders (shared preamble, <user_data> fencing with
escaping), Gemini REST call with responseMimeType=application/json + responseSchema, timeout,
one retry on 5xx/429, output zod validation, generic error mapping, Cache-Control: no-store.
Model and key from env only. Write the function tests listed in docs/TESTING.md with Gemini mocked.
```
**Checkpoint:** all proxy tests green; `git grep -n GEMINI_API_KEY src/` returns nothing.
Manual: `npm run dev:full` with a real key in `.dev.vars`, curl one task.
**Commit:** `feat(api): locked-down Gemini proxy with task registry and guards`

## Phase 4 — AI client + pseudonymization
**Prompt**
```
Implement src/ai/client.ts (callAi<T>(task, input, {signal}) → Result<T, AiError>), cache.ts
(sha-256 keyed, memory + sessionStorage), fallbacks.ts, and src/lib/pseudonymize.ts.
Add a useAi hook that exposes {status, data, error, retry} and announces via LiveRegion.
Tests: success, invalid JSON, schema fail, timeout, 429, abort, cache hit, and the integration test
asserting no guest names in outgoing bodies.
```
**Commit:** `feat(ai): typed client, caching, fallbacks and guest pseudonymization`

## Phase 5 — Intake (F1)
**Prompt**
```
Build features/intake per PRD F1: one-question-at-a-time flow driven by intakeNext with fallback,
input renderers per inputType, back/skip, priority weight sliders, summary card + confirm that
writes the event and creates initial budget lines (estimate) via engine/budget. Keyboard + axe tests.
```
**Commit:** `feat(intake): adaptive intake with priority weights`

## Phase 6 — Guest Lens + RSVP (F2, F4)
**Prompt**
```
Build features/guests: paste/CSV/manual entry, guestLens call, household expansion, need-group
summary chips, editable guest table with "Check this" flags for low confidence, RSVP controls,
header with confirmed/expected and change deltas. Version snapshot on import.
```
**Commit:** `feat(guests): AI guest lens, need groups and live RSVP tracking`

## Phase 7 — Plan view (F3)
**Prompt**
```
Build features/plan with tabs: Quantities (table with basis + editable overrides), Menu coverage
matrix, Seating zones, Accessibility checklist (checklist task, triggered deterministically),
Budget (category table, remaining, per-guest, source badges, edit lines). All recomputes live.
```
**Commit:** `feat(plan): needs-driven quantities, coverage, seating, checklist and budget`

## Phase 8 — Prep timeline + vendors + helpers (F5, F6)
**Prompt**
```
Build features/timeline (prepTasks call → schedule engine, list grouped by week, deps, critical
path marker, Do-next card, mark done/slip), features/vendors (vendorQuestions, quote log flipping
budget source), features/helpers (roster, assignment, helperBrief, printable card, share link via
URL fragment using lib/urlState with zod validation on open, read-only HelperCard route).
```
**Commit:** `feat: prep timeline, vendor checklist and helper roster with briefs`

## Phase 9 — Run sheet + Live mode (F7, F8)
**Prompt**
```
Build features/runsheet (runSheet call → validation, edit/reorder with move up/down buttons,
lock, constraint violations inline) and features/live (current/next, countdown, delay buttons,
liveShift → recovery call → validate/rank → radio options → apply; offline deterministic fallback;
assertive announcements; large-target high-contrast layout; lazy-loaded chunk).
```
**Commit:** `feat(live): run sheet and live mode with guest-aware recovery`

## Phase 10 — Versions, messages, export (F9, F10)
**Prompt**
```
Build features/versions (list, restore with validation), features/export (invites per need group
via invites task, print stylesheets for run sheet/cue sheets/helper cards, .ics download of prep
deadlines). Add keyboard shortcuts dialog per ACCESSIBILITY.md.
```
**Commit:** `feat: version history, invites and print/ics export`

## Phase 11 — Polish & hardening
**Prompt**
```
Run a full review against CLAUDE.md "Definition of done", docs/SECURITY.md checklist,
docs/ACCESSIBILITY.md and docs/TESTING.md manual script. Fix all lint warnings, raise coverage to
thresholds, check bundle size (<150 KB gzip initial), add empty states and error boundaries
everywhere, finish README.md. List anything not done.
```
**Commit:** `chore: hardening, a11y and performance pass`

## Phase 12 — Deploy & submit
Follow `docs/DEPLOYMENT.md`, then `docs/SUBMISSION.md`.

---

## Submission strategy (3 attempts, last one counts)
| Attempt | When | Goal |
|---|---|---|
| 1 | After Phase 9 deployed | Get the evaluator's feedback report early on core features |
| 2 | After fixing every item in report 1 + Phases 10–11 | Near-final |
| 3 | Only if attempt 2's report has fixable issues **and** you've verified the fix doesn't regress anything | Final |
Never submit attempt 3 casually — a lower final score replaces a higher earlier one.

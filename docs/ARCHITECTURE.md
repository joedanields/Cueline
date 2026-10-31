# Architecture — Cueline

## 1. Overview

```
┌──────────────────────────── Browser (static SPA on Cloudflare Pages) ───────────────────────────┐
│                                                                                                  │
│  React UI (routes, components)                                                                   │
│        │ dispatch                     ▲ selectors                                                │
│        ▼                              │                                                          │
│  Zustand store (plan, guests, tasks, runSheet, helpers, versions) ── persist ──► localStorage   │
│        │                              ▲                                                          │
│        │ pure calls                   │ derived data                                             │
│        ▼                              │                                                          │
│  src/engine/*  (quantities, seating, budget, schedule, runsheet, live-shift, ranking)           │
│                                                                                                  │
│  src/ai/client.ts ── pseudonymize ──► POST /api/ai {task, input} ──► zod-validate response      │
└────────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                 │ same origin
┌────────────────────────────────────────────────▼─────────────────────────────────────────────────┐
│ Cloudflare Pages Function  functions/api/ai.ts                                                   │
│   1. method/origin/content-type/size checks   2. zod-validate {task, input}                      │
│   3. best-effort rate limit                   4. build prompt from server-side template         │
│   5. call Gemini (structured JSON output)     6. return JSON (no key, no raw upstream errors)   │
│   env.GEMINI_API_KEY (secret)  env.GEMINI_MODEL                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Principle:** the browser owns all state and all math. The function is a thin, locked-down
translator between named tasks and Gemini.

## 2. Folder structure

```
cueline/
├─ CLAUDE.md
├─ README.md
├─ docs/
├─ functions/
│  └─ api/
│     ├─ ai.ts                 # onRequestPost handler
│     └─ _lib/
│        ├─ tasks.ts           # task registry: name → {inputSchema, buildPrompt, responseSchema}
│        ├─ gemini.ts          # fetch wrapper, timeout, retries(1), error mapping
│        ├─ guard.ts           # origin, size, content-type, rate limit
│        └─ schemas.ts         # shared zod schemas (re-exported from src/shared)
├─ src/
│  ├─ main.tsx, App.tsx, routes.tsx
│  ├─ shared/                  # code imported by BOTH src and functions (zod schemas, task names)
│  │  ├─ schemas/              # guest.ts, plan.ts, task.ts, runsheet.ts, ai.ts
│  │  └─ aiTasks.ts            # AI_TASKS const + input/output schema per task
│  ├─ engine/                  # PURE. no React, no fetch, no Date.now() (time is injected)
│  │  ├─ constants.ts
│  │  ├─ quantities.ts
│  │  ├─ menuCoverage.ts
│  │  ├─ seating.ts
│  │  ├─ budget.ts
│  │  ├─ rsvp.ts
│  │  ├─ schedule.ts           # backward scheduling, critical path, cycle detection
│  │  ├─ doNext.ts
│  │  ├─ runSheet.ts           # validation of segments + constraints
│  │  ├─ liveShift.ts          # apply delay, detect breaks
│  │  ├─ recovery.ts           # validate + rank recovery options, deterministic fallback
│  │  └─ ics.ts
│  ├─ ai/
│  │  ├─ client.ts             # callAi(task, input) → validated output | AiError
│  │  ├─ cache.ts              # in-memory + sessionStorage cache keyed by sha-256(task+input)
│  │  └─ fallbacks.ts          # static intake questions, default task templates
│  ├─ lib/
│  │  ├─ pseudonymize.ts
│  │  ├─ money.ts              # minor units, Intl.NumberFormat
│  │  ├─ urlState.ts           # compress/encode helper cards into URL fragment
│  │  └─ logger.ts
│  ├─ store/
│  │  ├─ index.ts              # create store, persist, hydrate-validate
│  │  ├─ slices/               # planSlice, guestSlice, taskSlice, runSheetSlice, helperSlice, versionSlice
│  │  └─ selectors.ts          # memoized derived data calling engine/*
│  ├─ features/                # one folder per PRD feature
│  │  ├─ intake/ guests/ plan/ rsvp/ timeline/ helpers/ vendors/ runsheet/ live/ versions/ export/
│  │  └─ <feature>/{Screen.tsx, components/, *.test.tsx}
│  ├─ components/ui/           # Button, Field, Dialog, Tabs, Badge, Slider, LiveRegion, SkipLink…
│  ├─ data/demo.ts             # demo scenario seed
│  └─ styles/index.css
├─ public/
│  ├─ _headers                 # security headers (see SECURITY.md)
│  ├─ _redirects               # SPA fallback: /*  /index.html  200
│  └─ favicon.svg
├─ tests/
│  ├─ setup.ts                 # vitest-axe, jest-dom, fetch mock
│  └─ fixtures/                # AI response fixtures per task
├─ .dev.vars.example
├─ .env.example
├─ vite.config.ts, vitest.config.ts, tsconfig*.json, tailwind.config.ts, eslint.config.js
└─ package.json
```

## 3. Data flow examples

### Guest import
1. User pastes text → `pseudonymize(lines)` → `{ text: "g_001: knee trouble, sugar-free ...", map }`
2. `callAi('guestLens', { lines, occasion, culturalContext })`
3. Response validated by `GuestLensResponseSchema` → merged into `guestSlice` with real names from map
4. Selectors recompute quantities / seating / budget / checklist triggers → UI updates
5. Version snapshot `"Imported 62 guests"`

### Live delay
1. Tap "+15 min" → `liveShift(runSheet, now, 15)` → `{ shifted, breaks[] }` (pure)
2. If `breaks.length === 0` → apply, announce "Schedule shifted by 15 minutes. No conflicts."
3. Else → `callAi('recovery', { segments, breaks, weights, needGroups })` (timeout 8 s per attempt)
4. Each option → `validateRecovery()` (pure) → drop invalid → `rankRecovery(weights)` → show
5. If AI fails/offline → `deterministicRecovery()` → show single option labelled "Quick fix"

## 4. AI task registry (summary — full detail in AI_PROMPTS.md)

| Task | Called from | Input (summary) | Output |
|---|---|---|---|
| `intakeNext` | F1 | answers so far | next question + type + options, or `done` |
| `guestLens` | F2 | pseudonymized lines, context | tags per guest id + confidence |
| `checklist` | F3 | triggered need flags, venue | accessibility/comfort checklist items |
| `prepTasks` | F5 | occasion, needs summary, venue, weeks out | task drafts with deps |
| `helperBrief` | F6 | helper's assignments | brief text |
| `vendorQuestions` | F6 | vendor type, needs summary | questions[] |
| `runSheet` | F7 | occasion, start/end, needs, helpers | segments with constraints |
| `recovery` | F8 | segments, breaks, weights | 2–3 options as structured ops |
| `invites` | F10 | need group, event facts | invite text per group |

## 5. State & persistence
- Single Zustand store, sliced. `persist` with `version` + `migrate`; on hydrate run
  `PersistedStateSchema.safeParse` → fallback to empty state + toast on failure.
- Versions: store up to 20 snapshots (structuredClone of persisted state), oldest evicted.
- Derived data is never persisted.

## 6. Performance budget
- Initial JS (gzip) < 150 KB; routes lazy-loaded; live mode is its own chunk.
- Engine recompute for 200 guests < 50 ms (unit-tested with a perf assertion on a generous bound).
- AI calls: debounced (500 ms) where triggered by typing, de-duplicated by cache, `AbortController`
  on unmount / superseding request.
- No layout shift from AI loading: skeletons with reserved height.

## 7. Error handling
- `AiError` union: `network | timeout | rate_limited | invalid_response | upstream`.
- Every AI-driven screen has: loading skeleton, error message with Retry, and a manual/fallback path.
- Error boundary per route; never a white screen.

## 8. Key decisions (ADR-lite)
| Decision | Why |
|---|---|
| Vite SPA over Next.js | Smaller repo/bundle, static deploy, no SSR needed (all state is local). |
| Pages Function proxy | Keeps the plain Gemini key server-side; required for the Security score. |
| Named tasks, not raw prompts | Stops the proxy being an open Gemini relay; enables per-task validation. |
| localStorage, no DB | Frontend-only requirement; privacy-friendly; zero ops. |
| Engine separate from AI | Honest numbers, testable, works offline in live mode. |

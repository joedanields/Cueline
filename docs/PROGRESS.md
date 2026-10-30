# Build progress — Cueline

## Phase log

### Phase 0 — Scaffold & tooling ✅
- Vite 6 + React 18 + TS strict (`noUncheckedIndexedAccess`), Tailwind 3 with CSS-variable colour
  tokens (light / dark / high-contrast live theme), ESLint 9 flat config (typescript-eslint strict,
  jsx-a11y strict, react-hooks, `react/no-danger`, `no-eval`, `no-console`, named-exports rule),
  Prettier, Vitest 3 + Testing Library + vitest-axe + jsdom, coverage thresholds from TESTING.md
  (engine ≥ 95 % lines).
- App shell: skip link, header/nav/main/footer landmarks, lazy routes, per-route error boundary,
  `Page` component (single h1, `document.title`, focus moves to h1 on navigation), app-level
  `LiveRegion` (polite + assertive).
- `tests/setup.ts` fails loudly on unmocked `fetch`. Security headers in `public/_headers`, SPA
  fallback in `public/_redirects`.

### Phase 1 — Shared schemas & store ✅
- Every DATA_MODEL schema in `src/shared/schemas/` with inferred types; valid + invalid fixture
  tests for each (`schemas.test.ts`).
- Zustand store with 9 slices + root actions (`loadDemo`, `deleteAllData`, `replaceState`),
  `persist` with `schemaVersion`, a never-throwing storage adapter, and zod validation in `merge`:
  corrupt JSON or tampered shapes reset to an empty plan with a toast.
- Versions: newest-first, max 20; restore validates the snapshot first.
- Demo scenario `src/data/demo.ts` (62 guests with the exact PRD §5 mix, 4 helpers, vendors,
  budget, 12 prep tasks, run sheet with the seniors' lunch constraint), dated relative to `now`.
- Home screen: Load demo, two-step "Delete all my data" (clears localStorage + sessionStorage).

### Phase 2 — Engine ✅
- Pure modules in `src/engine/`: `constants`, `rsvp`, `quantities`, `menuCoverage`, `seating`,
  `budget`, `needs` (need groups, anonymous need summary, deterministic checklist triggers),
  `schedule` (DFS topo order with cycle reporting, backward pass, forward pass for slips/late
  prereqs, slack-based critical path), `doNext`, `runSheet` (constraint evaluation for all 4
  kinds, validation), `liveShift` (`settle`, `applyDelay`, `liveState`, `advance`),
  `recoveryOps` + `recovery` (op checks, apply, score/rank per DATA_MODEL formula,
  deterministic "Quick fix"), `ics` (RFC 5545 escaping + line folding).
- Every exported function has a JSDoc with an example; time is always injected.
- Memoized selectors in `src/store/selectors.ts` (`memoLast` on input identity).
- Coverage: engine 100 % lines / 92 % branches. 200-guest full recompute well under 50 ms.

### Phase 3 — AI proxy ✅
- `functions/api/ai.ts` (`onRequest`: 405 for non-POST with `Allow`), guards in `_lib/guard.ts`
  (content-type 415 → origin allowlist + same-origin 403, missing Origin rejected → per-IP token
  bucket 20/min with LRU cap 429 → 32 KB cap on declared length and streamed bytes 413), zod
  envelope + per-task input validation 400.
- Task registry for all 9 tasks (`_lib/tasks.ts`), prompts built server-side only
  (`_lib/prompts.ts`: shared preamble, `<user_data>` fencing with `& < >` escaping), Gemini
  `responseSchema` per task (`_lib/geminiSchemas.ts`), REST call with timeout (15 s, 8 s for
  recovery), one retry on 5xx/429 with jitter, never on 4xx, generic error codes only,
  output zod validation (502 `invalid_response`), `Cache-Control: no-store`.
- Contracts shared with the browser in `src/shared/aiTasks.ts`; fixtures for every task in
  `tests/fixtures/ai/` (valid + invalid).
- 33 proxy tests (all guards, happy path + invalid output for each task, retry, timeout, key
  never in bodies). `git grep GEMINI_API_KEY src/` and the `AIza…` grep both return nothing.

### Phase 4 — AI client + pseudonymization ✅
- `src/ai/client.ts`: `callAi(task, input, {signal, timeoutMs, cache})` → `Result<T, AiError>`;
  validates input before sending and output before returning; never throws; friendly message
  per error kind (`network | timeout | rate_limited | invalid_response | upstream | bad_request | aborted`).
- `src/ai/cache.ts`: SHA-256 keyed, bounded memory map + sessionStorage; cached values are
  re-validated on read. Cleared by "Delete all my data".
- `src/ai/fallbacks.ts`: static intake questions (weather only if outdoor), static checklist map,
  generic + need-triggered prep tasks.
- `src/lib/pseudonymize.ts`: name/details split, kinship words kept as context, every name token
  replaced by that guest's `g_###` id everywhere (longest first), emails and ≥ 7-digit runs masked,
  `restoreNames` for client-side re-attachment.
- `src/ai/useAi.ts`: `{status, data, error, run, retry, reset}`, LiveRegion announcements
  (errors assertive), abort on unmount/supersede.
- Tests: success, invalid JSON, schema fail, timeout, 429, abort, cache hit (+ tampered cache),
  and the integration test proving no demo guest name or phone digits appear in the outgoing body.

### Phase 5 — Intake (F1) ✅
- `/intake`: one question at a time driven by `intakeNext`; on AI failure the static list takes
  over for the session (with a visible notice). When the AI says "done", missing required fields
  are still asked from the static list. Max 8 questions. Back, Skip, "Skip to the summary".
- Renderers per field (`FieldInput`): enum fields (venue, meals) always use fixed options; AI
  wording is used for the question text and "why". Native range sliders for the 5 weights with
  `aria-valuetext`.
- Summary card: every answer editable, error summary (role=alert, focused), confirm →
  `confirmEvent` store action (sets event, allocates estimate budget lines via `engine/budget`
  when the total or weights change, snapshots a version). Existing events open in the summary.
- New UI primitives: `Field` (label/hint/error wired with `aria-describedby`), `ChoiceGroup`,
  `WeightSliders`, `Button` (`aria-busy`, text busy label).
- Tests: logic unit tests, answer → next question, back, skip, fallback, keyboard confirm,
  edit mode, axe in question and summary states.

## Decisions
| Phase | Decision | Reason |
|---|---|---|
| 0 | Moved `cueline-docs/{CLAUDE.md,README.md,docs}` to the repo root. | ARCHITECTURE §2 puts them at the root next to `src/`. |
| 0 | `react-router` **7.18.4** (declarative mode) instead of `react-router-dom` 6. | v6 has open advisories (GHSA-wrjc-x8rr-h8h6 etc.); `npm audit --omit=dev` must be clean (SECURITY §6). Same `<Routes>/<Route>/lazy` API. |
| 0 | `zod` **4.6.7** instead of 3.x. | zod < 4.6.6 has a high-severity advisory (GHSA-mrhx-c7xc-m3w5). |
| 0 | Pinned proven majors for tooling (Vite 6, Vitest 3, ESLint 9, Tailwind 3). | `vitest-axe@0.1` and `tailwind.config.ts` (named in the docs) target these. |
| 0 | `wrangler` added as a devDependency. | Needed by `npm run dev:full`; dev-only, not shipped. |
| 0 | No `@cloudflare/workers-types`; the function declares a minimal `Env`/context type. | Keep dependencies minimal. |
| 1 | Version history persisted alongside the plan (same localStorage key), validated with `VersionListSchema`. | ARCHITECTURE §5 requires 20 restorable snapshots; `PersistedStateSchema` stays exactly as in DATA_MODEL. |
| 1 | RSVP change log (F4) is session-only store state, not persisted. | Avoids changing the persisted data model. |
| 1 | `newId()` (`src/lib/id.ts`) uses `crypto.getRandomValues` instead of `nanoid`. | Same format (prefix + 8 chars) without a new dependency. |
| 1 | Added `.max()` bounds to every persisted array/string. | Bounded validation cost; mitigates oversized-input memory exhaustion. |
| 1 | A budget line with `perGuest: true` stores the **per-guest unit amount**; total = unit × expected headcount (engine). | DATA_MODEL: such lines "scale with expected headcount". |
| 1 | axe in jsdom runs with `color-contrast` disabled (`tests/axe.ts`). | jsdom has no canvas; contrast is guaranteed by the documented tokens and checked with Lighthouse. |
| 2 | **Data model addition:** `menu: Dish[]` (`DishSchema`: id, name, course, suitableFor) on `PersistedStateSchema`, default `[]`. | PRD F3 needs a menu-coverage matrix, but DATA_MODEL had no dish shape. Default keeps old saves valid. DATA_MODEL.md updated. |
| 2 | "Invited" (no reply) counts as attending (weight 1); "maybe" uses `maybeProbability`; "no" = 0. | Organizers cater for everyone not yet declined; avoids under-catering before RSVPs arrive. |
| 2 | Coverage counts mains only; vegan ⇒ vegetarian + dairy-free; jain ⇒ vegetarian; "other" diet excluded. | TESTING.md rules; "other" can't be matched to dishes. |
| 2 | Budget categories map to weights: venue/rentals ← comfort, others ← same-named weight; 5 % contingency off the top; largest-remainder split. | Exact integer sums, weight 0 ⇒ 0 estimate. |
| 2 | Live delay: upcoming unlocked segments shift; the live segment runs long by the delay; `settle(now)` marks past segments done first. | Keeps recovery from touching segments that already happened. |
| 2 | Constraints on skipped segments no longer apply, so recovery may never drop a segment that carries a hard constraint. | Prevents "fix seniors' lunch by dropping lunch". |
| 3 | Proxy tests live in `tests/functions/` rather than next to `functions/api/ai.ts`. | Anything under `functions/` is scanned by the Pages Functions bundler; keeping vitest imports out avoids breaking the deploy build. |
| 3 | `guestLens` output is a flat guest list; household members come back as `g_002a`, `g_002b`… | Gemini response schemas can't express nested optional "members" cleanly; the client groups by id prefix. |
| 3 | Recovery ops use one flat Gemini object shape (`op` + optional fields); zod's discriminated union enforces the real shape. | Gemini's schema subset has no reliable `oneOf`. |
| 3 | Requests without an `Origin` header are rejected (403). | SECURITY §2.3; browsers always send Origin on POST, so only scripts are affected. |
| 4 | `AiError` adds `bad_request` and `aborted` to the documented union. | Invalid input is caught client-side before sending; aborts (unmount/supersede) must not show an error. |
| 4 | Pseudonymization keeps kinship words ("Nani", "grandpa", "family") and household counts. | They carry the age/role signal Guest Lens needs without identifying anyone. |
| 5 | The AI chooses *which* question and its wording; the field decides the input control. | Enum answers (venue, meals) can't drift from the schema; AI options are only used for free-form fields (weather backup, kids' ages). |
| 5 | Rough guest count, kids' ages and weather backup are kept in `event.notes`. | They have no field in `EventSchema`; notes keep them visible without a data-model change. |
| 5 | Re-confirming the event re-allocates estimate lines only if the total, currency or weights changed. | Avoids discarding manual estimate edits on unrelated changes; quotes/confirmed are never touched. |
| 2 | Shorten/drop pull later movable segments earlier by the freed minutes; swap/moveBefore re-sequence from the earliest affected segment. | Matches a sequential run sheet; parallel segments after a swap get serialized (acceptable). |

## Needs human
- **Phase 3 manual check:** put a real key in `.dev.vars` (copy `.dev.vars.example`; set
  `GEMINI_MODEL` to a current Gemini flash model id), run `npm run dev:full`, then
  `curl -X POST http://localhost:8788/api/ai -H "content-type: application/json" -H "Origin: http://localhost:8788" -d '{"task":"checklist","input":{"triggers":["mobility:wheelchair"],"venueType":"hall","outdoor":false}}'`.
  All proxy behaviour is covered by mocked tests; real Gemini output against the response
  schemas is unverified until this runs.

## Open issues
- (none yet)

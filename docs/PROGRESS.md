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
| 2 | Shorten/drop pull later movable segments earlier by the freed minutes; swap/moveBefore re-sequence from the earliest affected segment. | Matches a sequential run sheet; parallel segments after a swap get serialized (acceptable). |

## Needs human
- (none yet)

## Open issues
- (none yet)

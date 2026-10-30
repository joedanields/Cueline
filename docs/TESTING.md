# Testing — Cueline

## Strategy
| Layer | Tool | What | Coverage target |
|---|---|---|---|
| Engine (pure) | Vitest | every function, edge cases, property-style loops | **≥ 95 % lines** |
| Shared schemas | Vitest | valid/invalid fixtures for every schema | 100 % of schemas |
| AI client | Vitest + fetch mock | success, invalid JSON, schema fail, timeout, 429, abort, cache hit | ≥ 90 % |
| Pages Function | Vitest (node env) calling `onRequestPost` with mock `Request`/`env` + mocked Gemini fetch | every guard + happy path per task | ≥ 90 % |
| Components/screens | Testing Library + user-event | user flows, keyboard flows, error states | ≥ 75 % |
| Accessibility | vitest-axe | each screen in default, loading, error states | 0 violations |

Global thresholds in `vitest.config.ts`: lines 85, functions 85, branches 80, statements 85.

## Rules
- Tests live next to code: `quantities.ts` → `quantities.test.ts`.
- No real network. `tests/setup.ts` stubs `fetch` to fail loudly if not mocked.
- AI fixtures in `tests/fixtures/ai/<task>.json` (valid) and `<task>.invalid.json`.
- Time is injected (`now` param) — no `vi.useFakeTimers` needed for engine; use it only for UI timers.
- Test names describe behaviour: `it('adds a table when expected headcount crosses a multiple of 8')`.
- Every bug fix starts with a failing test.

## Required test cases (minimum)

### engine/quantities
- zero guests → all zero, no NaN
- infants contribute 0 to food, children 0.5
- "maybe" RSVPs counted at `maybeProbability`
- outdoor adds drinks uplift
- rounding always up, buffer applied once
- user override replaces computed line and is labelled "manual"

### engine/menuCoverage
- group with 0 members not required
- vegan dish counts for vegetarian, not vice versa
- jain ⊂ vegetarian rules; diabetic_friendly independent

### engine/seating
- wheelchair users placed in step-free zone; zone capacity respected
- honoree table always exists
- overflow creates new table, never exceeds seatsPerTable

### engine/budget
- allocation sums exactly to total (no rounding drift; integer minor units)
- weight 0 category gets 0 estimate unless confirmed lines exist
- confirmed/quote lines never overwritten by re-allocation
- per-guest lines scale with expected headcount

### engine/schedule
- backward scheduling from event date; deps respected
- cycle detected → returns error listing cycle keys (no infinite loop)
- slipping a task marks dependents at-risk; critical path recomputed
- task whose latest start is in the past → `isAtRisk`

### engine/doNext
- returns ≤ 3, excludes blocked/done, critical first, then soonest due

### engine/runSheet + liveShift + recovery
- overlap for same owner detected
- delay of 0 is a no-op
- delay shifts only unlocked, upcoming segments
- hard constraint break detected with correct `byMin`
- invalid AI op (shorten below min, drop non-optional, touch locked) discarded
- ranking prefers options fixing hard breaks; ties broken by lower weighted minutes lost
- deterministic fallback always returns a valid option or explicit "no safe fix"

### lib/pseudonymize
- names replaced consistently; mapping reversible
- emails and ≥7-digit runs masked
- **outgoing `/api/ai` body never contains any guest name** (integration test through `callAi`)

### functions/api/ai
- 405 GET · 415 wrong content-type · 403 bad origin · 413 large body · 400 unknown task / bad input
- 429 when rate limit exceeded
- happy path per task returns schema-valid JSON (Gemini mocked)
- upstream 500 → retried once → 502 generic body, no upstream text leaked
- API key never present in any response body or log call

### UI flows (Testing Library)
- Intake: answer → next question appears; skip; back; fallback when AI fails
- Guest Lens: paste → loading announced → groups render → edit low-confidence tag
- RSVP change updates quantities text
- Timeline: mark done → Do-next updates
- Live mode: +15 → if no breaks, announcement; with breaks, options listed & selectable via keyboard
- Every screen: `expect(await axe(container)).toHaveNoViolations()`

## Commands
```bash
npm run test          # all
npm run coverage      # with thresholds
npx vitest engine     # just engine
```

## Manual test script (before each submission)
1. Load demo → walk every route with keyboard only (Tab/Shift+Tab/Enter/Space/Esc/arrows).
2. Screen reader smoke test (NVDA/VoiceOver) on Guest Lens and Live mode.
3. Throttle network to offline → live mode still shifts and offers Quick fix.
4. 200% zoom and 320 px width → no horizontal scroll, nothing clipped.
5. Lighthouse (mobile): Performance ≥ 90, Accessibility 100, Best Practices ≥ 95.

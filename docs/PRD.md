# PRD — Cueline

> **Guests in. Cues out.**
> A guest-first planner that turns "who's coming" into quantities, seating, accessibility, prep
> tasks, helper assignments and a live run sheet that re-plans itself when the day runs late.

## 1. The three core questions

| Question | Answer |
|---|---|
| **Who is it for?** | Family and community organizers hosting 20–200 guests of mixed ages, with volunteer helpers and no professional planner. Birthdays, anniversaries, small weddings, reunions, community gatherings. |
| **What's most stressful for them?** | (a) Planning for *different kinds of guests* at once — toddlers, grandparents, vegans, a wheelchair user, people travelling in. (b) Coordinating helpers who each need to know *what, when, where*. (c) The day itself running late and not knowing what to cut. |
| **How does GenAI meaningfully help?** | It reads a messy, free-text guest list and understands needs a form never captures ("Nani — knee trouble, sugar-free"). It drafts tasks, run sheets and helper briefs tailored to *these* guests and *this* occasion's cultural context, and ranks recovery options on the day by guest impact. Deterministic code keeps every number honest. |

## 2. Problem-statement alignment map

| Problem-statement expectation | Cueline feature | Section |
|---|---|---|
| Ask practical, user-specific questions | Adaptive intake conversation | F1 |
| Tailor to occasion, culture, guest demographics, accessibility | Guest Lens + needs-aware plan | F2, F3 |
| Categorize expenses, show impact of changes on budget | Budget panel, live recalculation from RSVPs | F3, F4 |
| Clarify estimates vs vendor-confirmed | `estimate / quote / confirmed` badge on every money line | F3 |
| Vague goal → prioritized tasks with deadlines & dependencies | Prep timeline + "Do next" | F5 |
| Adapt timeline to real-time changes / vendor delays | Task slip handling + Live mode | F5, F8 |
| Trade-offs without blind cutting; reprioritize | Priority weights + ranked recovery options | F1, F8 |
| Vendor questions, compare quotes, track factors | Vendor checklist with needs-driven questions + quote log | F6 |
| Coordinator, not magic arranger | Helper roster, briefs, cue cards; no fabricated availability | F6, F7 |
| Revise without restart | Every input editable; everything recomputes; version snapshots | F9 |
| Execution over inspiration | Run sheet, live mode, printable cue sheets, .ics | F7, F8, F10 |

## 3. Features & acceptance criteria

### F1 — Adaptive intake
Conversational setup, one question at a time, max ~8 questions.
- Asks: occasion, date + start time, venue type (home / hall / outdoor / restaurant), city/region
  (free text, used only for cultural/climate context), total budget + currency, rough guest count,
  cultural or religious context (optional), top priorities.
- **Priority weights**: 5 sliders (0–5) — Food, Guest comfort & accessibility, Decor, Entertainment,
  Photos. Used by recovery ranking and budget allocation.
- Gemini decides the *next* question based on previous answers (e.g. outdoor → asks about weather
  backup; kids mentioned → asks age range).
- **AC**: user can skip any question; can go back and edit; finishes with a summary card they confirm.
- **AC**: if AI fails, a static fallback question set is used (app still works).

### F2 — Guest Lens
- Input: paste free text (one guest or family per line, any format) or CSV upload, or add manually.
- Names are pseudonymized client-side before sending.
- Gemini returns per-guest tags: `ageBand` (infant/child/teen/adult/senior), `dietary[]`,
  `mobility`, `sensory`, `travel` (local/out-of-town), `role` (honoree/vip/helper/guest), plus a
  short `note` and a `confidence` per inferred tag.
- UI groups guests into **need groups** (e.g. "Seniors · 9", "Vegetarian · 14", "Step-free access · 2").
- **AC**: every tag is editable; low-confidence tags are visually flagged "Check this".
- **AC**: households expand into members ("Raman family (4)" → 4 guest rows with editable bands).

### F3 — Needs → Plan
Deterministic engine (`src/engine/`) computes:
- **Food & drink quantities** by age band × meal type × event duration (heuristics in constants,
  editable by the user).
- **Menu coverage matrix**: every dietary group must have ≥ N dishes; gaps highlighted.
- **Seating zones**: quiet/near-restroom for seniors, step-free for mobility, near play area for
  kids, honoree table; capacity per zone.
- **Accessibility checklist**: generated wording by Gemini, triggered deterministically by tags
  (e.g. any `mobility: wheelchair` → ramp / step-free route / accessible restroom items).
- **Budget**: categories (venue, food, decor, entertainment, photos, rentals, misc). Initial
  allocation by priority weights; every line has `source` badge. Per-guest cost shown.
- **AC**: changing any guest, RSVP, weight or budget updates all of the above in < 50 ms with no AI call.

### F4 — RSVP tracker
- Status per guest: invited / yes / no / maybe. "Maybe" counted at a configurable probability (default 50%).
- Header shows: confirmed, expected (weighted), and delta vs plan with what it changed
  ("+6 expected → +2.1 kg mains, +1 table, budget food +X").
- **AC**: quantities/seating/budget recompute live; a change log entry is recorded.

### F5 — Prep timeline
- Gemini drafts tasks from occasion + needs + venue (title, category, duration estimate, depends-on,
  latest-start offset in days before the event, suggested owner role).
- Engine schedules backward from event date, detects impossible chains, computes critical path.
- **"Do next"** card: top 3 actionable tasks (unblocked, soonest deadline, on critical path first).
- Mark task done / slipped. Slipping a task re-schedules dependents and flags at-risk ones.
- **AC**: tasks show deadline, dependencies, owner; overdue/at-risk use icon + text, not colour alone.

### F6 — Helper roster & vendor checklist
- Add helpers (name, phone optional, availability window). Assign tasks and run-sheet cues.
- Gemini writes a 3–5 line **brief** per helper based only on their assignments.
- **Helper card**: printable page and a shareable read-only link (data encoded in URL fragment,
  no server storage).
- **Vendor checklist**: per vendor type, Gemini generates questions driven by guest needs
  ("Can you provide 6 sugar-free dessert portions?", "Is the hall step-free from parking?").
  User logs quotes (amount, inclusions, validity); budget line flips to `quote`/`confirmed`.
- **AC**: app never claims a vendor is available or a price is real unless the user entered it.

### F7 — Run sheet
- Gemini drafts the event-day schedule as segments (start offset, duration, title, owner, cue,
  `guestConstraints[]` e.g. `seniors_meal_before_20:00`, `kids_activity_before_nap`).
- Engine validates: no overlaps for the same owner, constraints satisfied, fits venue hours.
- **AC**: user can reorder, edit durations, lock segments; violations show inline with the reason.

### F8 — Live mode (event day)
- Big, high-contrast, one-hand UI. Current segment, next segment, countdown.
- Buttons: "Running late" (+5 / +10 / +15 / custom), "Segment done", "Skip".
- On delay: engine shifts unlocked segments and detects constraint breaks.
  If any break, Gemini proposes 2–3 **recovery options** (shorten X, swap Y and Z, drop W), engine
  re-validates each, and options are ranked by priority weights + guest impact.
- **AC**: applying an option updates cue cards and is announced to screen readers.
- **AC**: works offline after load (no AI) — falls back to deterministic "shorten lowest-priority
  unlocked segments" suggestion.

### F9 — Versions & editing
- Snapshot saved on every significant change (intake confirm, guest import, recovery applied).
- Version list with timestamp + reason; restore any version.
- **AC**: no change requires restarting the flow.

### F10 — Messages & export
- Invite wording per need group (tone + key info relevant to that group).
- Export: print stylesheet for run sheet / cue sheets / helper cards; `.ics` file with prep deadlines.

## 4. Out of scope (say so in README)
Payments, real vendor marketplace, user accounts, multi-device sync, sending SMS/email (we produce
text to copy), native mobile apps.

## 5. Demo scenario (seed data, `src/data/demo.ts`)
"Grandpa's 75th birthday lunch" — 62 guests incl. 11 seniors (2 wheelchair users), 9 children,
14 vegetarian, 3 diabetic-friendly, 6 out-of-town; outdoor garden venue with indoor backup;
4 helpers. Live-mode demo: cake arrives 25 min late → recovery keeps seniors' lunch on time.

## 6. Success metrics (for the write-up)
- Time from blank → full plan for 60 guests: < 5 minutes.
- 0 invented prices (all AI money lines labelled `estimate`).
- 0 axe violations; full keyboard path through every flow.

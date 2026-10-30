# Accessibility — Cueline

Target: **WCAG 2.2 AA**, Lighthouse Accessibility 100, zero axe violations.
Cueline plans *for* guests with access needs — the app itself must model that standard.

## Foundations
- `<html lang>` set; one `<h1>` per route; headings never skip levels.
- Landmarks: `header`, `nav` (primary), `main#main`, `footer`. "Skip to main content" link first in tab order.
- Route change: move focus to the route `<h1>` and update `document.title` ("Guests · Cueline").
- Respect `prefers-reduced-motion` (disable transitions) and `prefers-color-scheme`.
- Text resizes to 200 % with no loss; layout works at 320 px (reflow).
- Target size ≥ 24×24 px (≥ 44×44 in Live mode).

## Colour & contrast
- Body text ≥ 4.5:1; large text & UI components/focus rings ≥ 3:1. Tokens checked in `tailwind.config.ts`.
- **Never colour alone**: statuses use icon + text (e.g. ⚠ "At risk", ✓ "Done"); money source
  badges include the word (`Estimate`, `Quote`, `Confirmed`).
- Focus ring: 2 px solid, offset 2 px, high-contrast token, visible on all backgrounds.

## Components (`src/components/ui/`)
| Component | Requirements |
|---|---|
| Button | native `<button>`; `aria-busy` while loading; loading text not icon-only |
| Field | `<label for>`; hint + error linked via `aria-describedby`; `aria-invalid` on error; error text announced |
| Slider (weights) | native `<input type="range">` with visible label and value text (`aria-valuetext="4 of 5, high"`) |
| Tabs | WAI-ARIA tabs pattern: arrow keys, Home/End, `aria-selected`, roving tabindex |
| Dialog | native `<dialog>` or focus-trapped; Esc closes; focus returns to trigger; labelled by title |
| Toast | `role="status"`; never the only place important info appears; not auto-dismissed in < 5 s |
| LiveRegion | single app-level `aria-live="polite"` + one `assertive` for Live-mode conflicts |
| Table (quantities, budget) | real `<table>`, `<caption>`, `<th scope>`; numeric columns right-aligned |
| Drag reorder (run sheet) | **must** also offer "Move up / Move down" buttons — keyboard alternative |
| Charts (budget donut, if any) | decorative SVG `aria-hidden`; adjacent text/table carries the data |

## AI-specific
- When an AI request starts: announce "Analysing guest list…"; when done: "Found 6 need groups,
  4 tags need your review." On error: announce the error + focus the Retry button.
- Low-confidence tags labelled with text "Check this", not just a dashed border.
- AI-written text is presented as editable drafts, clearly marked "Draft — edit freely".

## Live mode
- Large type (≥ 24 px body), high-contrast theme by default, one-handed bottom controls.
- Countdown updates are **not** announced every second (only at segment change and when ≤ 5 min).
- Delay result announced assertively when a guest constraint breaks:
  "Seniors' lunch would now start at 13:45, after the 13:30 limit. 3 recovery options available."
- Recovery options are a radio group; "Apply" button; result announced.

## Printing
- Print styles for run sheet, cue sheets and helper cards: black on white, ≥ 12 pt, no backgrounds.

## Keyboard map (documented in an in-app "Keyboard shortcuts" dialog, `?` to open)
| Key | Action |
|---|---|
| `?` | open shortcuts help |
| `g` then `g/r/t/l` | go to Guests / Run sheet / Timeline / Live |
| In Live: `d` | +5 min delay (with confirmation) |
| In Live: `n` | mark current segment done |
Shortcuts are single-key only when focus is not in a text field, and can be turned off (WCAG 2.1.4).

## Testing (see TESTING.md)
- `vitest-axe` on every screen and state.
- Keyboard-only test per flow.
- Manual screen reader pass before each submission.

# Submission kit — Cueline

## 1. What to submit
| Item | Requirement | Status |
|---|---|---|
| GitHub repo | **Public**, < 10 MB, README complete | ☐ |
| Deployment link | Cloudflare Pages URL, working `/api/ai` | ☐ |
| Video | YouTube **unlisted** or Drive link with "Anyone with the link" access | ☐ |
| LinkedIn post | Tools, prompt evolution, GenAI use | ☐ |

## 2. Final checklist (run before every attempt)
- [ ] `npm run lint && npm run typecheck && npm run coverage && npm run build` green
- [ ] Security checklist in `docs/SECURITY.md` §7 all ticked
- [ ] Lighthouse mobile: Perf ≥ 90, A11y 100, Best Practices ≥ 95
- [ ] Keyboard-only walkthrough of every screen
- [ ] Repo opened in a private/incognito window → visible without login
- [ ] Video link opened in incognito → plays
- [ ] Deployed site: demo loads, every AI task works with the production key
- [ ] README "How GenAI is used" and "Prompt evolution" sections filled in
- [ ] `docs/AI_PROMPTS.md` prompt evolution log has real entries

## 3. Video walkthrough script (~4–5 min, show every feature)

| Time | Screen | Show / say (on-screen captions if no voiceover) |
|---|---|---|
| 0:00 | Landing | "Cueline — guest-first planning, from who's coming to a live run sheet." |
| 0:15 | Intake | Answer 3–4 adaptive questions; show a question that changed because of a prior answer (outdoor → weather backup). Set priority weights (Comfort 5, Food 4, Decor 2). |
| 0:50 | Guest Lens | Paste messy list → loading → need groups appear. Show a household expanding, a "Check this" low-confidence tag being fixed. Mention names never leave the browser. |
| 1:30 | Plan | Quantities with basis text; menu coverage gap for diabetic-friendly; seating zones (step-free); accessibility checklist; budget with Estimate/Quote/Confirmed badges. |
| 2:10 | RSVP change | Mark 6 guests "yes" → quantities, tables, budget update instantly (no AI). |
| 2:30 | Timeline | Prep tasks with deps; a need-triggered task ("Confirm step-free entry"); slip a task → dependents go at-risk; Do-next card. |
| 3:00 | Vendors & helpers | Vendor questions driven by guest needs; log a quote → line flips to Quote. Assign helper, generate brief, open shared helper card. |
| 3:30 | Run sheet | Segments with guest constraints; try an invalid edit → inline reason. |
| 3:50 | **Live mode** | "Cake 25 min late" → +25 → constraint break announced → 3 ranked recovery options → apply → cue cards update. Toggle offline → Quick fix still works. |
| 4:30 | Versions & export | Restore an earlier version; print cue sheet; download .ics. |
| 4:45 | Close | Keyboard-only + screen-reader-friendly; key stays server-side; tests & coverage badge. |

Recording tips: 1080p, browser zoom 110 %, hide bookmarks bar, use the demo scenario, record the
*deployed* URL (proves it works at submission time).

## 4. LinkedIn post draft (edit to your voice)

```
I built Cueline for #PromptWars Virtual Challenge 5 — a guest-first celebration planner.

Most planners start with a budget. Real gatherings start with people: grandparents who need to eat
on time, a cousin in a wheelchair, toddlers, vegetarian aunts, friends flying in.

What Cueline does:
• Reads a messy guest list and turns it into need groups (age, diet, mobility, travel)
• Computes food quantities, seating zones, menu coverage and an accessibility checklist
• Builds a prep timeline with dependencies and a "do this next" card
• Writes helper briefs and shareable cue cards
• On the day, Live mode re-plans when things run late — ranking recovery options by what matters
  to *your* guests

How I used GenAI:
• Gemini (structured JSON output) for understanding free text and drafting tasks, run sheets,
  briefs and recovery options
• A deterministic engine for every number — the AI never invents prices or quantities
• Guest names are pseudonymised before any AI call; the API key stays server-side
• Built with prompt-driven development in Claude Code

Prompt evolution: [2–3 real lessons from docs/AI_PROMPTS.md log — e.g. "v1 of the guest prompt
guessed ages too confidently; adding per-field confidence + a review UI fixed trust"]

Stack: React + TypeScript + Vite, Cloudflare Pages + Functions, Gemini API, Vitest, axe.

🔗 Live: <url>   💻 Code: <github>   🎥 Demo: <video>

#GenAI #Gemini #ClaudeCode #Accessibility #BuildInPublic
```

## 5. Attempt log
| # | Date | Commit | Score | Key feedback | Action taken |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

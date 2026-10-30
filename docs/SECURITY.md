# Security — Cueline

Target: pass automated security review with no findings. The biggest single risk in this project
type is an exposed API key — that is designed out.

## 1. Secrets
| Item | Where it lives | Never |
|---|---|---|
| `GEMINI_API_KEY` | Cloudflare Pages → Settings → Variables and Secrets (type **Secret**), local `.dev.vars` | in `src/`, in `VITE_*` vars, in git, in logs, in responses |
| `GEMINI_MODEL` | Cloudflare variable (plain), `.dev.vars` | — |
| `ALLOWED_ORIGINS` | Cloudflare variable, comma-separated | — |

- `.gitignore` includes: `.env`, `.env.*` (except `.env.example`), `.dev.vars`, `node_modules`, `dist`, `coverage`.
- Commit `.dev.vars.example` with placeholder values only.
- CI/pre-submit check: `git grep -nE "AIza[0-9A-Za-z_-]{20,}"` must return nothing.

## 2. Proxy hardening (`functions/api/ai.ts`)
1. Only `POST`; others → 405.
2. `Content-Type: application/json` required → else 415.
3. `Origin` must be in `ALLOWED_ORIGINS` (plus same-origin) → else 403.
4. Body ≤ 32 KB (check `content-length` and actual read length) → else 413.
5. `{ task, input }` validated by zod; task must be in registry → else 400.
6. Best-effort rate limit: per-IP (`CF-Connecting-IP`) token bucket in isolate memory, 20 req / min.
   Document in DEPLOYMENT.md how to add a Cloudflare WAF rate-limiting rule for `/api/ai` as the
   durable layer.
7. Prompts are built server-side from templates; client never supplies prompt text.
8. Upstream errors mapped to generic codes; no stack traces or upstream bodies returned.
9. Responses: `Cache-Control: no-store`, `Content-Type: application/json`.
10. Timeouts via `AbortController`.

## 3. HTTP security headers (`public/_headers`)
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
```
- Self-host fonts (no Google Fonts CDN) so CSP stays `'self'`.
- If Tailwind/Vite needs inline styles, keep `'unsafe-inline'` for **style only**, never script.

## 4. Client-side
- No `dangerouslySetInnerHTML`, `eval`, `new Function`, `innerHTML`.
- ESLint rules: `no-eval`, `no-implied-eval`, `react/no-danger` = error.
- All persisted state validated on load (tampered localStorage can't crash or inject).
- Helper share links: data in URL **fragment** (`#…`) so it never reaches any server log; contains
  only that helper's name, tasks, segments — never other guests' data. Validated with zod on open.
- CSV import: parse as text, cap size (200 KB) and rows (500), strip formula prefixes
  (`=`,`+`,`-`,`@`) on export to prevent CSV injection.
- `.ics` export: escape commas, semicolons, newlines per RFC 5545.

## 5. Privacy
- Guest names never leave the browser: `pseudonymize()` replaces names with `g_###` before any
  `/api/ai` call. Unit test asserts the outgoing body contains no guest names.
- Free-text notes are sent (needed for need-detection) — UI hint tells users not to paste phone
  numbers/addresses; `pseudonymize()` also masks emails and digit runs ≥ 7.
- "Delete all my data" button clears localStorage + sessionStorage cache.
- No analytics, no third-party scripts.

## 6. Dependencies
- `npm audit --omit=dev` clean before each submission.
- Pin versions via `package-lock.json`; commit it.
- Minimal dependency list (see CLAUDE.md).

## 7. Pre-submission security checklist
- [ ] Key grep returns nothing; `.dev.vars` not tracked (`git ls-files | grep dev.vars` empty)
- [ ] `/api/ai` returns 405 for GET, 403 for foreign Origin, 400 for unknown task, 413 for big body
- [ ] Headers present on deployed site (check with browser devtools → Network)
- [ ] `npm audit --omit=dev` clean
- [ ] No `console.log`, no `dangerouslySetInnerHTML` (`git grep`)

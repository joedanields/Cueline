# Deployment — Cloudflare Pages

## 1. Prerequisites
- Node 20+ (commit `.nvmrc` with `20`)
- Cloudflare account; GitHub repo (**public**, required for evaluation)
- Gemini API key from Google AI Studio

## 2. Local development
```bash
cp .dev.vars.example .dev.vars        # then put your real key in .dev.vars (gitignored)
npm install
npm run dev:full                      # build, then wrangler pages dev dist: UI + /api/ai on :8788
```
`.dev.vars.example`
```
GEMINI_API_KEY=replace-me
GEMINI_MODEL=replace-with-current-flash-model
ALLOWED_ORIGINS=http://localhost:8788
```

## 3. Create the Pages project (Git integration — recommended)
1. Cloudflare dashboard → **Workers & Pages** → Create → **Pages** → Connect to Git → pick the repo.
2. Build settings:
   - Framework preset: **None** (or Vite)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/` (the `functions/` folder at repo root is auto-detected)
3. Environment variables (Production **and** Preview):
   | Name | Type | Value |
   |---|---|---|
   | `GEMINI_API_KEY` | **Secret** (encrypted) | your key |
   | `GEMINI_MODEL` | Text | current Gemini flash model id |
   | `ALLOWED_ORIGINS` | Text | `https://<project>.pages.dev` (+ custom domain if any) |
   | `NODE_VERSION` | Text | `20` |
4. Deploy. Every push to `main` redeploys automatically.

**CLI alternative**
```bash
npx wrangler pages project create cueline
npx wrangler pages secret put GEMINI_API_KEY --project-name cueline
npm run build && npx wrangler pages deploy dist --project-name cueline
```

## 4. Post-deploy verification
```bash
URL=https://<project>.pages.dev
curl -I $URL                                   # security headers present
curl -s -o /dev/null -w "%{http_code}\n" $URL/api/ai                 # 405
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "content-type: application/json" \
     -H "Origin: https://evil.example" -d '{}' $URL/api/ai           # 403
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "content-type: application/json" \
     -H "Origin: $URL" -d '{"task":"nope","input":{}}' $URL/api/ai   # 400
```
Then in the browser: load demo → run Guest Lens → open Live mode → +25 min → recovery options appear.

## 5. Durable rate limiting (optional, recommended)
The in-function limiter is best-effort (per isolate). If you attach a **custom domain**, add a
Cloudflare WAF rate-limiting rule: path equals `/api/ai`, 30 requests / 1 min / per IP → Block.
(WAF rules apply to zones you own, not to `*.pages.dev`.) Also set a usage cap/quota on the Gemini
key in Google AI Studio / Cloud console.

## 6. Repo hygiene before pushing
```bash
git ls-files | grep -E "\.dev\.vars$|\.env$"          # must be empty
git grep -nE "AIza[0-9A-Za-z_-]{20,}"                  # must be empty
du -sh --exclude=node_modules --exclude=.git .        # must be < 10 MB
```

## 7. Rollback
Cloudflare dashboard → project → Deployments → pick previous → **Rollback**.

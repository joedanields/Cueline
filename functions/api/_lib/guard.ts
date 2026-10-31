import type { AiErrorCode } from './schemas';

export const MAX_BODY_BYTES = 32 * 1024;
export const RATE_LIMIT_PER_MIN = 20;
const WINDOW_MS = 60_000;
/** Cap tracked IPs so a flood of distinct addresses can't grow isolate memory without bound. */
const MAX_TRACKED_IPS = 5_000;

export type GuardFailure = { code: AiErrorCode; status: number };

/**
 * Origin must be in the comma-separated allowlist or equal the request's own origin.
 * A missing Origin is rejected: browsers always send one on cross-site and same-site POSTs.
 * @example checkOrigin(req, 'https://cueline.pages.dev') // null when allowed
 */
export function checkOrigin(
  request: Request,
  allowedOrigins: string | undefined,
): GuardFailure | null {
  const origin = request.headers.get('origin');
  if (!origin) return { code: 'forbidden', status: 403 };
  const allowed = new Set(
    (allowedOrigins ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  );
  allowed.add(new URL(request.url).origin);
  return allowed.has(origin) ? null : { code: 'forbidden', status: 403 };
}

/** Only `application/json` bodies (charset parameter allowed). */
export function checkContentType(request: Request): GuardFailure | null {
  const type = request.headers.get('content-type') ?? '';
  return type.split(';')[0]?.trim().toLowerCase() === 'application/json'
    ? null
    : { code: 'unsupported_media_type', status: 415 };
}

/**
 * Read the body as text, enforcing the byte cap on both the declared length and the actual stream.
 */
export async function readBodyCapped(
  request: Request,
  maxBytes = MAX_BODY_BYTES,
): Promise<string | GuardFailure> {
  const tooLarge: GuardFailure = { code: 'payload_too_large', status: 413 };
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > maxBytes) return tooLarge;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return tooLarge;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

type Bucket = { tokens: number; updated: number };

/**
 * Best-effort per-IP token bucket kept in isolate memory (20 requests / minute).
 * Durable limiting is a Cloudflare WAF rule — see docs/DEPLOYMENT.md §5.
 */
export function createRateLimiter(limit = RATE_LIMIT_PER_MIN, now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>();
  return (ip: string): boolean => {
    const t = now();
    const b = buckets.get(ip) ?? { tokens: limit, updated: t };
    b.tokens = Math.min(limit, b.tokens + ((t - b.updated) / WINDOW_MS) * limit);
    b.updated = t;
    buckets.delete(ip); // re-insert to keep Map order = least recently used first
    if (buckets.size >= MAX_TRACKED_IPS) {
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    buckets.set(ip, b);
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  };
}

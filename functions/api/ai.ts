import { AiRequestSchema, type AiErrorCode } from './_lib/schemas';
import { TASKS } from './_lib/tasks';
import { callGemini, type GeminiDeps, type GeminiEnv } from './_lib/gemini';
import { checkContentType, checkOrigin, createRateLimiter, readBodyCapped } from './_lib/guard';

export type Env = GeminiEnv & { ALLOWED_ORIGINS?: string };
type Context = { request: Request; env: Env };

const STATUS: Record<AiErrorCode, number> = {
  bad_request: 400,
  forbidden: 403,
  method_not_allowed: 405,
  unsupported_media_type: 415,
  payload_too_large: 413,
  rate_limited: 429,
  timeout: 504,
  upstream: 502,
  invalid_response: 502,
  misconfigured: 500,
};

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...extra } });

/** Generic error body — never upstream text, stack traces or configuration details. */
const fail = (code: AiErrorCode) => json({ error: code }, STATUS[code]);

const defaultDeps: GeminiDeps = {
  fetch: (...args) => fetch(...args),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random: Math.random,
};

type Parsed = { task: (typeof TASKS)[keyof typeof TASKS]; input: unknown };

/** JSON-parse the body and validate the envelope and the task's own input schema. */
function parseRequest(body: string): Parsed | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return undefined;
  }
  const envelope = AiRequestSchema.safeParse(raw);
  if (!envelope.success) return undefined;
  const task = TASKS[envelope.data.task];
  const input = task.inputSchema.safeParse(envelope.data.input);
  return input.success ? { task, input: input.data } : undefined;
}

/** Method, content type, origin and rate limit — cheap checks before reading the body. */
function preflight(request: Request, env: Env, allow: (ip: string) => boolean) {
  if (request.method !== 'POST')
    return json({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  const guard = checkContentType(request) ?? checkOrigin(request, env.ALLOWED_ORIGINS);
  if (guard) return fail(guard.code);
  if (!allow(request.headers.get('cf-connecting-ip') ?? 'unknown')) return fail('rate_limited');
  return undefined;
}

/** Build the POST handler; dependencies are injectable so tests never touch the network. */
export function createHandler(
  deps: GeminiDeps = defaultDeps,
  allow: (ip: string) => boolean = createRateLimiter(),
) {
  return async ({ request, env }: Context): Promise<Response> => {
    const rejected = preflight(request, env, allow);
    if (rejected) return rejected;
    const body = await readBodyCapped(request);
    if (typeof body !== 'string') return fail(body.code);
    const parsed = parseRequest(body);
    if (!parsed) return fail('bad_request');
    const prompt = parsed.task.buildPrompt(parsed.input as never);
    const result = await callGemini(env, parsed.task, prompt, deps);
    return result.ok ? json({ data: result.data }) : fail(result.code);
  };
}

const handler = createHandler();

/** Cloudflare Pages Function entry: every method is routed here; only POST is served. */
export const onRequest = (context: Context): Promise<Response> => handler(context);

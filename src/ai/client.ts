import { AiSchemas, type AiInput, type AiOutput, type AiTaskName } from '../shared/aiTasks';
import { cacheGet, cacheKey, cacheSet } from './cache';

export type AiErrorKind =
  | 'network'
  | 'timeout'
  | 'rate_limited'
  | 'invalid_response'
  | 'upstream'
  | 'bad_request'
  | 'aborted';
export type AiError = { kind: AiErrorKind; message: string };
export type Result<T, E> = { ok: true; data: T; cached: boolean } | { ok: false; error: E };

export const AI_ENDPOINT = '/api/ai';
const CLIENT_TIMEOUT_MS = 55_000; // proxy may make two 25 s attempts; allow for network overhead
const RECOVERY_TIMEOUT_MS = 18_000; // proxy may make two 8 s attempts

const MESSAGES: Record<AiErrorKind, string> = {
  network: 'Couldn’t reach the assistant. Check your connection and try again.',
  timeout: 'The assistant took too long to answer. Try again.',
  rate_limited: 'Too many requests right now. Wait a minute and try again.',
  invalid_response: 'The assistant’s answer didn’t look right, so it wasn’t used. Try again.',
  upstream: 'The assistant is unavailable right now. Try again shortly.',
  bad_request: 'That request couldn’t be sent. Please check your inputs.',
  aborted: 'Request cancelled.',
};

const error = (kind: AiErrorKind): { ok: false; error: AiError } => ({
  ok: false,
  error: { kind, message: MESSAGES[kind] },
});

function kindForStatus(status: number, code: unknown): AiErrorKind {
  if (status === 429) return 'rate_limited';
  if (status === 504) return 'timeout';
  if (status === 400 || status === 413 || status === 415) return 'bad_request';
  if (code === 'invalid_response') return 'invalid_response';
  return 'upstream';
}

type CallOptions = { signal?: AbortSignal; timeoutMs?: number; cache?: boolean };

/** An abort signal that fires on timeout or when the caller's own signal aborts. */
function linkedTimeout(ms: number, outer: AbortSignal | undefined) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  const onAbort = () => ctrl.abort();
  outer?.addEventListener('abort', onAbort);
  const dispose = () => {
    clearTimeout(timer);
    outer?.removeEventListener('abort', onAbort);
  };
  return { signal: ctrl.signal, dispose };
}

/** POST one task to the proxy and validate `data` with the task's output schema. */
async function post<T extends AiTaskName>(
  task: T,
  input: unknown,
  signal: AbortSignal,
): Promise<Result<AiOutput<T>, AiError>> {
  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ task, input }),
    signal,
  });
  const body = (await res.json().catch(() => undefined)) as
    | { data?: unknown; error?: unknown }
    | undefined;
  if (!res.ok) return error(kindForStatus(res.status, body?.error));
  const output = AiSchemas[task].output.safeParse(body?.data);
  if (!output.success) return error('invalid_response');
  return { ok: true, data: output.data as AiOutput<T>, cached: false };
}

/**
 * Call a named AI task through the proxy. Input is validated before sending; the response is
 * validated with the task's output schema before it is returned. Never throws.
 * @example const r = await callAi('helperBrief', input); if (r.ok) show(r.data.brief);
 */
export async function callAi<T extends AiTaskName>(
  task: T,
  input: AiInput<T>,
  opts: CallOptions = {},
): Promise<Result<AiOutput<T>, AiError>> {
  const schemas = AiSchemas[task];
  const parsedInput = schemas.input.safeParse(input);
  if (!parsedInput.success) return error('bad_request');
  const useCache = opts.cache !== false;
  const key = await cacheKey(task, parsedInput.data);
  const hit = useCache ? fromCache(task, key) : undefined;
  if (hit) return hit;
  if (opts.signal?.aborted) return error('aborted');
  const result = await send(task, parsedInput.data, opts);
  if (result.ok && useCache) cacheSet(key, result.data);
  return result;
}

function fromCache<T extends AiTaskName>(task: T, key: string) {
  const hit = AiSchemas[task].output.safeParse(cacheGet(key));
  return hit.success
    ? { ok: true as const, data: hit.data as AiOutput<T>, cached: true }
    : undefined;
}

/** POST with a timeout linked to the caller's signal; maps thrown errors to error kinds. */
async function send<T extends AiTaskName>(task: T, input: unknown, opts: CallOptions) {
  const defaultMs = task === 'recovery' ? RECOVERY_TIMEOUT_MS : CLIENT_TIMEOUT_MS;
  const linked = linkedTimeout(opts.timeoutMs ?? defaultMs, opts.signal);
  try {
    return await post(task, input, linked.signal);
  } catch {
    if (opts.signal?.aborted) return error('aborted');
    return error(linked.signal.aborted ? 'timeout' : 'network');
  } finally {
    linked.dispose();
  }
}

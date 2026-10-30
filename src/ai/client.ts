import { AiSchemas, type AiInput, type AiOutput, type AiTaskName } from '../shared/aiTasks';
import { cacheGet, cacheKey, cacheSet } from './cache';

export type AiErrorKind = 'network' | 'timeout' | 'rate_limited' | 'invalid_response' | 'upstream' | 'bad_request' | 'aborted';
export type AiError = { kind: AiErrorKind; message: string };
export type Result<T, E> = { ok: true; data: T; cached: boolean } | { ok: false; error: E };

export const AI_ENDPOINT = '/api/ai';
const CLIENT_TIMEOUT_MS = 20_000; // proxy gives up at 15 s; allow for network overhead
const RECOVERY_TIMEOUT_MS = 10_000;

const MESSAGES: Record<AiErrorKind, string> = {
  network: 'Couldn’t reach the assistant. Check your connection and try again.',
  timeout: 'The assistant took too long to answer. Try again.',
  rate_limited: 'Too many requests right now. Wait a minute and try again.',
  invalid_response: 'The assistant’s answer didn’t look right, so it wasn’t used. Try again.',
  upstream: 'The assistant is unavailable right now. Try again shortly.',
  bad_request: 'That request couldn’t be sent. Please check your inputs.',
  aborted: 'Request cancelled.',
};

const error = (kind: AiErrorKind): { ok: false; error: AiError } => ({ ok: false, error: { kind, message: MESSAGES[kind] } });

function kindForStatus(status: number, code: unknown): AiErrorKind {
  if (status === 429) return 'rate_limited';
  if (status === 504) return 'timeout';
  if (status === 400 || status === 413 || status === 415) return 'bad_request';
  if (code === 'invalid_response') return 'invalid_response';
  return 'upstream';
}

type CallOptions = { signal?: AbortSignal; timeoutMs?: number; cache?: boolean };

/**
 * Call a named AI task through the proxy. Input is validated before sending; the response is
 * validated with the task's output schema before it is returned. Never throws.
 */
export async function callAi<T extends AiTaskName>(task: T, input: AiInput<T>, opts: CallOptions = {}): Promise<Result<AiOutput<T>, AiError>> {
  const schemas = AiSchemas[task];
  const parsedInput = schemas.input.safeParse(input);
  if (!parsedInput.success) return error('bad_request');
  const useCache = opts.cache !== false;
  const key = await cacheKey(task, parsedInput.data);
  if (useCache) {
    const hit = schemas.output.safeParse(cacheGet(key));
    if (hit.success) return { ok: true, data: hit.data as AiOutput<T>, cached: true };
  }
  if (opts.signal?.aborted) return error('aborted');

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), opts.timeoutMs ?? (task === 'recovery' ? RECOVERY_TIMEOUT_MS : CLIENT_TIMEOUT_MS));
  const onAbort = () => timeout.abort();
  opts.signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task, input: parsedInput.data }),
      signal: timeout.signal,
    });
    const body = (await res.json().catch(() => undefined)) as { data?: unknown; error?: unknown } | undefined;
    if (!res.ok) return error(kindForStatus(res.status, body?.error));
    const output = schemas.output.safeParse(body?.data);
    if (!output.success) return error('invalid_response');
    if (useCache) cacheSet(key, output.data);
    return { ok: true, data: output.data as AiOutput<T>, cached: false };
  } catch {
    if (opts.signal?.aborted) return error('aborted');
    return error(timeout.signal.aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

import type { AiErrorCode } from './schemas';
import type { TaskDefinition } from './tasks';
import type { Prompt } from './prompts';

export type GeminiEnv = { GEMINI_API_KEY?: string; GEMINI_MODEL?: string };
export type GeminiDeps = {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
};
export type GeminiResult = { ok: true; data: unknown } | { ok: false; code: AiErrorCode };

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const RETRY_BASE_MS = 400;
const RETRY_JITTER_MS = 800;

const isRetryable = (status: number) => status === 429 || status >= 500;

/** Extract `candidates[0].content.parts[0].text` without trusting the upstream shape. */
function candidateText(body: unknown): string | undefined {
  const text = (body as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === 'string' ? text : undefined;
}

async function attempt(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  deps: GeminiDeps,
): Promise<Response | 'timeout' | 'network'> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await deps.fetch(url, { ...init, signal: controller.signal });
  } catch {
    return controller.signal.aborted ? 'timeout' : 'network';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call Gemini with structured JSON output. One retry on 5xx/429 (with jitter); never on 4xx.
 * Upstream bodies are never returned — only generic error codes.
 */
export async function callGemini(
  env: GeminiEnv,
  task: TaskDefinition,
  prompt: Prompt,
  deps: GeminiDeps,
): Promise<GeminiResult> {
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) return { ok: false, code: 'misconfigured' };
  const url = `${API_BASE}/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`;
  const init: RequestInit = {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: prompt.system }] },
      contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: task.responseSchema,
        temperature: task.temperature,
        maxOutputTokens: task.maxOutputTokens,
        // Thinking adds seconds of latency and spends the output-token budget; these tasks are
        // schema-constrained wording, and the engine re-validates everything that matters.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  };

  let res = await attempt(url, init, task.timeoutMs, deps);
  if (typeof res !== 'string' && isRetryable(res.status)) {
    await deps.sleep(RETRY_BASE_MS + deps.random() * RETRY_JITTER_MS);
    res = await attempt(url, init, task.timeoutMs, deps);
  }
  if (res === 'timeout') return { ok: false, code: 'timeout' };
  if (res === 'network') return { ok: false, code: 'upstream' };
  if (res.status === 429) return { ok: false, code: 'rate_limited' };
  if (!res.ok) return { ok: false, code: 'upstream' };

  try {
    const text = candidateText(await res.json());
    if (text === undefined) return { ok: false, code: 'invalid_response' };
    const parsed = task.outputSchema.safeParse(JSON.parse(text));
    return parsed.success
      ? { ok: true, data: parsed.data }
      : { ok: false, code: 'invalid_response' };
  } catch {
    return { ok: false, code: 'invalid_response' };
  }
}

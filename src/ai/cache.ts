const STORAGE_PREFIX = 'cueline-ai:';
const MAX_MEMORY_ENTRIES = 50;

const memory = new Map<string, unknown>();

/**
 * SHA-256 hex digest of the task + canonical input — the cache key, so no raw input is stored as a key.
 * @example await cacheKey('checklist', { triggers: ['x'] }) // '3f…' (64 hex chars)
 */
export async function cacheKey(task: string, input: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(`${task}\u0000${JSON.stringify(input)}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Read a cached response: memory first, then sessionStorage. Callers re-validate the value. */
export function cacheGet(key: string): unknown {
  if (memory.has(key)) return memory.get(key);
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

/** Store a validated response in memory (bounded, oldest evicted) and sessionStorage. */
export function cacheSet(key: string, value: unknown): void {
  memory.delete(key);
  memory.set(key, value);
  if (memory.size > MAX_MEMORY_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota or blocked storage: the memory cache still works.
  }
}

/** Clear both cache layers (used by "Delete all my data" and tests). */
export function cacheClear(): void {
  memory.clear();
  try {
    for (const k of Object.keys(sessionStorage))
      if (k.startsWith(STORAGE_PREFIX)) sessionStorage.removeItem(k);
  } catch {
    // ignore
  }
}

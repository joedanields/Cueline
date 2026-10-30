import { afterEach, describe, expect, it, vi } from 'vitest';
import { AI_ENDPOINT, callAi } from './client';
import { cacheClear, cacheGet, cacheKey, cacheSet } from './cache';
import { fallbackChecklist, fallbackPrepTasks, nextFallbackQuestion } from './fallbacks';
import { pseudonymize, splitGuestLine } from '../lib/pseudonymize';
import { buildDemoGuests } from '../data/demoGuests';
import { AI_INPUTS, AI_OUTPUTS } from '../../tests/fixtures/ai';

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const mockFetch = (impl: (url: string, init: RequestInit) => Promise<Response>) => {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
};

describe('callAi', () => {
  afterEach(() => cacheClear());

  it('returns validated data on success and posts {task, input} only', async () => {
    const fetchMock = mockFetch(async () => jsonResponse({ data: AI_OUTPUTS.checklist }));
    const r = await callAi('checklist', AI_INPUTS.checklist);
    expect(r).toEqual({ ok: true, data: AI_OUTPUTS.checklist, cached: false });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(AI_ENDPOINT);
    expect(Object.keys(JSON.parse(String(init.body)) as object)).toEqual(['task', 'input']);
  });

  it('maps invalid JSON and schema failures to invalid_response', async () => {
    mockFetch(async () => new Response('<html>oops', { status: 200 }));
    expect(await callAi('checklist', AI_INPUTS.checklist, { cache: false })).toMatchObject({ ok: false, error: { kind: 'invalid_response' } });
    mockFetch(async () => jsonResponse({ data: { items: 'nope' } }));
    expect(await callAi('checklist', AI_INPUTS.checklist, { cache: false })).toMatchObject({ ok: false, error: { kind: 'invalid_response' } });
    mockFetch(async () => jsonResponse({ error: 'invalid_response' }, 502));
    expect(await callAi('checklist', AI_INPUTS.checklist, { cache: false })).toMatchObject({ ok: false, error: { kind: 'invalid_response' } });
  });

  it('maps 429, 504, 400 and other failures', async () => {
    const cases: [number, string][] = [[429, 'rate_limited'], [504, 'timeout'], [400, 'bad_request'], [502, 'upstream'], [500, 'upstream']];
    for (const [status, kind] of cases) {
      mockFetch(async () => jsonResponse({ error: 'x' }, status));
      const r = await callAi('checklist', AI_INPUTS.checklist, { cache: false });
      expect(r.ok ? 'ok' : r.error.kind).toBe(kind);
    }
    mockFetch(async () => {
      throw new TypeError('offline');
    });
    const offline = await callAi('checklist', AI_INPUTS.checklist, { cache: false });
    expect(offline.ok ? 'ok' : offline.error.kind).toBe('network');
  });

  it('times out with a timeout error', async () => {
    mockFetch((_u, init) => new Promise((_r, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('a', 'AbortError')))));
    const r = await callAi('checklist', AI_INPUTS.checklist, { cache: false, timeoutMs: 10 });
    expect(r.ok ? 'ok' : r.error.kind).toBe('timeout');
  });

  it('reports aborted when the caller aborts (before or during the request)', async () => {
    mockFetch((_u, init) => new Promise((_r, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('a', 'AbortError')))));
    const ctrl = new AbortController();
    const pending = callAi('checklist', AI_INPUTS.checklist, { cache: false, signal: ctrl.signal });
    await Promise.resolve();
    ctrl.abort();
    expect(await pending).toMatchObject({ ok: false, error: { kind: 'aborted' } });
    expect(await callAi('checklist', AI_INPUTS.checklist, { cache: false, signal: AbortSignal.abort() })).toMatchObject({ ok: false, error: { kind: 'aborted' } });
  });

  it('serves a cache hit without a network call, and re-validates cached values', async () => {
    const fetchMock = mockFetch(async () => jsonResponse({ data: AI_OUTPUTS.checklist }));
    await callAi('checklist', AI_INPUTS.checklist);
    const second = await callAi('checklist', AI_INPUTS.checklist);
    expect(second).toMatchObject({ ok: true, cached: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const key = await cacheKey('checklist', AI_INPUTS.checklist);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    cacheClear();
    sessionStorage.setItem(`cueline-ai:${key}`, JSON.stringify({ items: 'tampered' }));
    await callAi('checklist', AI_INPUTS.checklist);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid input before any request', async () => {
    const fetchMock = mockFetch(async () => jsonResponse({}));
    const r = await callAi('checklist', { triggers: [], venueType: 'hall', outdoor: false });
    expect(r).toMatchObject({ ok: false, error: { kind: 'bad_request' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('INTEGRATION: the outgoing /api/ai body never contains any guest name', async () => {
    const guests = buildDemoGuests();
    const raw = guests.map((g, i) => `${g.name} — ${i % 2 ? 'veg, phone 98765 43210' : `cousin of ${guests[(i + 1) % guests.length]?.name ?? ''}`}`);
    const { lines } = pseudonymize(raw.map(splitGuestLine));
    const fetchMock = mockFetch(async () => jsonResponse({ data: AI_OUTPUTS.guestLens }));
    await callAi('guestLens', { lines, occasion: 'Birthday' });
    const body = String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body);
    const nameTokens = new Set(guests.flatMap((g) => g.name.split(' ')));
    for (const token of nameTokens) expect(body).not.toMatch(new RegExp(`\\b${token}\\b`));
    expect(body).not.toContain('98765');
  });
});

describe('cache', () => {
  it('survives blocked sessionStorage and evicts beyond the memory cap', () => {
    for (let i = 0; i < 60; i++) cacheSet(`k${i}`, i);
    expect(cacheGet('k59')).toBe(59);
    expect(cacheGet('missing')).toBeUndefined();
    cacheClear();
    expect(cacheGet('k59')).toBeUndefined();
  });
});

describe('fallbacks', () => {
  it('walks the static intake list and only asks about weather for outdoor venues', () => {
    expect(nextFallbackQuestion([], {})).toMatchObject({ field: 'occasion' });
    const askedToVenue = ['occasion', 'startsAt', 'endsAt', 'venueType'] as const;
    expect(nextFallbackQuestion([...askedToVenue], { venueType: 'Hall' })).toMatchObject({ field: 'guestCountRough' });
    expect(nextFallbackQuestion([...askedToVenue], { venueType: 'Outdoor' })).toMatchObject({ field: 'weatherBackup' });
    const all = ['occasion', 'startsAt', 'endsAt', 'venueType', 'weatherBackup', 'guestCountRough', 'budget', 'mealTypes', 'culturalContext', 'weights'] as const;
    expect(nextFallbackQuestion([...all], {})).toEqual({ done: true });
  });

  it('builds checklist items and need-triggered prep tasks', () => {
    expect(fallbackChecklist(['venue:outdoor', 'unknown']).items).toHaveLength(2);
    const tasks = fallbackPrepTasks(['mobility:wheelchair'], 5).tasks;
    expect(tasks.some((t) => t.needTrigger === 'mobility:wheelchair')).toBe(true);
    expect(Math.max(...tasks.map((t) => t.latestStartDaysBefore))).toBe(5);
  });
});

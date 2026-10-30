import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './index';
import { useToastStore } from './toastStore';
import { CORRUPT_MESSAGE, STORAGE_KEY } from './persistence';
import { PersistedStateSchema, emptyPersistedState } from '../shared/schemas';
import { makeGuest, makeSegment, makeTask, validEvent, validHelper } from '../../tests/fixtures/state';

const reset = () => {
  useStore.getState().deleteAllData();
  useToastStore.setState({ toasts: [] });
  localStorage.clear();
};

describe('store persistence', () => {
  beforeEach(reset);

  it('writes the plan to localStorage', () => {
    useStore.getState().setEvent(validEvent);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { state: unknown };
    expect(PersistedStateSchema.safeParse(raw.state).success).toBe(true);
  });

  it('rehydrates a valid stored plan', async () => {
    const state = { ...emptyPersistedState(), event: validEvent, guests: [makeGuest()], versions: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 1 }));
    await useStore.persist.rehydrate();
    expect(useStore.getState().guests).toHaveLength(1);
    expect(useStore.getState().event?.title).toBe('Test party');
  });

  it('resets safely with a toast when stored JSON is corrupt', async () => {
    useStore.getState().addGuests([makeGuest()]);
    useStore.setState({ guests: [] });
    localStorage.setItem(STORAGE_KEY, '{not json');
    await useStore.persist.rehydrate();
    expect(useStore.getState().guests).toEqual([]);
    expect(useToastStore.getState().toasts[0]?.text).toBe(CORRUPT_MESSAGE);
  });

  it('resets safely when stored state fails the schema (tampering)', async () => {
    const tampered = { ...emptyPersistedState(), guests: [{ id: 'x', name: '<script>' }], versions: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: tampered, version: 1 }));
    await useStore.persist.rehydrate();
    expect(useStore.getState().guests).toEqual([]);
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('does not toast on a first visit with no stored plan', async () => {
    await useStore.persist.rehydrate();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});

describe('store actions', () => {
  beforeEach(reset);

  it('updates, re-RSVPs and removes guests', () => {
    const s = useStore.getState();
    s.addGuests([makeGuest({ id: 'g_a' }), makeGuest({ id: 'g_b', rsvp: 'invited' })]);
    s.updateGuest('g_a', { ageBand: 'senior' });
    s.setRsvp(['g_b'], 'maybe');
    s.removeGuest('g_a');
    expect(useStore.getState().guests).toEqual([expect.objectContaining({ id: 'g_b', rsvp: 'maybe' })]);
  });

  it('unassigns a removed helper from tasks and segments', () => {
    const s = useStore.getState();
    s.upsertHelper(validHelper);
    s.setTasks([makeTask({ ownerId: 'h_1' })]);
    s.setRunSheet({ segments: [makeSegment({ ownerId: 'h_1' })], constraints: [], delayLog: [] });
    s.removeHelper('h_1');
    const after = useStore.getState();
    expect(after.helpers).toEqual([]);
    expect(after.tasks[0]?.ownerId).toBeUndefined();
    expect(after.runSheet?.segments[0]?.ownerId).toBeUndefined();
  });

  it('sets and clears quantity overrides and clamps maybe probability', () => {
    const s = useStore.getState();
    s.setQuantityOverride('mains', 12);
    expect(useStore.getState().quantityOverrides).toEqual({ mains: 12 });
    s.setQuantityOverride('mains', undefined);
    expect(useStore.getState().quantityOverrides).toEqual({});
    s.setMaybeProbability(3);
    expect(useStore.getState().maybeProbability).toBe(1);
  });

  it('keeps a bounded, newest-first change log', () => {
    for (let i = 0; i < 60; i++) useStore.getState().logChange(`change ${i}`);
    const log = useStore.getState().changeLog;
    expect(log).toHaveLength(50);
    expect(log[0]?.text).toBe('change 59');
  });
});

describe('versions', () => {
  beforeEach(reset);

  it('snapshots and restores a previous plan', () => {
    const s = useStore.getState();
    s.addGuests([makeGuest()]);
    s.snapshot('One guest');
    s.addGuests([makeGuest({ id: 'g_2' })]);
    const id = useStore.getState().versions[0]?.id ?? '';
    expect(useStore.getState().restoreVersion(id)).toBe(true);
    expect(useStore.getState().guests).toHaveLength(1);
  });

  it('refuses to restore an invalid snapshot', () => {
    useStore.setState({ versions: [{ id: 'ver_bad', at: new Date().toISOString(), reason: 'x', snapshot: { nope: 1 } }] });
    expect(useStore.getState().restoreVersion('ver_bad')).toBe(false);
    expect(useStore.getState().restoreVersion('missing')).toBe(false);
  });

  it('keeps at most 20 versions', () => {
    for (let i = 0; i < 25; i++) useStore.getState().snapshot(`v${i}`);
    expect(useStore.getState().versions).toHaveLength(20);
    expect(useStore.getState().versions[0]?.reason).toBe('v24');
  });
});

describe('demo and delete', () => {
  beforeEach(reset);

  it('loads the demo scenario and snapshots it', () => {
    useStore.getState().loadDemo();
    const s = useStore.getState();
    expect(s.guests).toHaveLength(62);
    expect(s.helpers).toHaveLength(4);
    expect(s.versions[0]?.reason).toMatch(/demo/i);
  });

  it('deletes all data including the AI cache', () => {
    useStore.getState().loadDemo();
    sessionStorage.setItem('ai-cache', 'x');
    useStore.getState().deleteAllData();
    const s = useStore.getState();
    expect(s.event).toBeUndefined();
    expect(s.guests).toEqual([]);
    expect(s.versions).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
});

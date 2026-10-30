import { beforeEach, describe, expect, it } from 'vitest';
import { buildGuestsFromLens, guestsWithoutAi, lowConfidenceFields, parseCsvGuests, parseCsvRows, parsePastedLines } from './guestImport';
import { describeDelta, planFigures, type PlanFigures } from './rsvpDelta';
import { AI_OUTPUTS } from '../../../tests/fixtures/ai';
import type { AiOutput } from '../../shared/aiTasks';
import { useStore } from '../../store';
import { makeGuest } from '../../../tests/fixtures/state';

describe('guest import', () => {
  it('parses pasted lines, ignoring blanks and capping at 250', () => {
    expect(parsePastedLines('Asha — veg\n\n  Ravi  ')).toEqual([{ name: 'Asha', details: 'veg' }, { name: 'Ravi', details: '' }]);
    expect(parsePastedLines(Array.from({ length: 300 }, (_, i) => `G${i}`).join('\n'))).toHaveLength(250);
  });

  it('parses CSV with quotes, CRLF and a header row', () => {
    expect(parseCsvRows('a,"b,""c"""\r\n1,2')).toEqual([['a', 'b,"c"'], ['1', '2']]);
    expect(parseCsvGuests('Name,Age,Notes\nAsha,40,"veg, nut allergy"\n,,\nRavi,,')).toEqual([
      { name: 'Asha', details: 'veg, nut allergy' },
      { name: 'Ravi', details: '' },
    ]);
    expect(parseCsvGuests('Asha,veg,wheelchair')).toEqual([{ name: 'Asha', details: 'veg, wheelchair' }]);
    expect(parseCsvGuests('x'.repeat(201 * 1024))).toEqual({ error: expect.stringMatching(/200 KB/) });
  });

  it('re-attaches names, expands households and keeps lines the AI skipped', () => {
    const idToName = new Map([['g_001', 'Grandpa'], ['g_002', 'Raman family'], ['g_003', 'Asha']]);
    const guests = buildGuestsFromLens(AI_OUTPUTS.guestLens as AiOutput<'guestLens'>, idToName);
    expect(guests.map((g) => g.name)).toEqual(['Grandpa', 'Raman family · adult 1', 'Raman family · child 1', 'Asha']);
    expect(guests[1]?.householdId).toBeDefined();
    expect(guests[1]?.householdId).toBe(guests[2]?.householdId);
    expect(guests[0]).toMatchObject({ role: 'honoree', ageBand: 'senior', rsvp: 'invited', reviewed: false });
    expect(lowConfidenceFields(guests[0] as never)).toEqual(['sensory', 'travel']);
    expect(lowConfidenceFields(guests[3] as never)).toHaveLength(6);
  });

  it('adds guests without AI with every tag flagged, and reviewed guests have no flags', () => {
    const [g] = guestsWithoutAi([{ name: 'Asha', details: 'veg' }]);
    expect(g?.note).toBe('veg');
    expect(lowConfidenceFields({ ...g, reviewed: true } as never)).toEqual([]);
  });
});

describe('rsvp delta', () => {
  const base: PlanFigures = { expected: 10, mainsKg: 4, tables: 2, foodBudget: 9000_00, currency: 'INR' };

  it('describes what an RSVP change did to the plan', () => {
    const text = describeDelta(base, { ...base, expected: 16, mainsKg: 6.1, tables: 3, foodBudget: 14400_00 });
    expect(text).toMatch(/^\+6 expected → \+2\.1 kg mains, \+1 table, food budget \+₹5,400/);
    expect(describeDelta(base, base)).toBe('No change to the plan.');
    expect(describeDelta(base, { ...base, expected: 9.5 })).toBe('−0.5 expected (no change to quantities, tables or budget)');
    expect(describeDelta(base, { ...base, tables: 0 })).toMatch(/−2 tables/);
  });

  beforeEach(() => useStore.getState().deleteAllData());

  it('reads the figures from the live store', () => {
    useStore.getState().loadDemo();
    const f = planFigures(useStore.getState());
    expect(f.expected).toBeGreaterThan(50);
    expect(f.mainsKg).toBeGreaterThan(10);
    expect(f.currency).toBe('INR');
    useStore.getState().deleteAllData();
    useStore.getState().addGuests([makeGuest()]);
    expect(planFigures(useStore.getState())).toMatchObject({ mainsKg: 0, foodBudget: 0, currency: 'USD' });
  });
});

import { describe, expect, it } from 'vitest';
import { computeMenuCoverage, dishSatisfies } from './menuCoverage';
import { chunkTables, computeSeating, totalTables } from './seating';
import { checklistTriggers, computeNeedGroups, needLabel, needSummary } from './needs';
import { makeGuest } from '../../tests/fixtures/state';
import type { Dish } from '../shared/schemas';

const dish = (id: string, suitableFor: Dish['suitableFor'], course: Dish['course'] = 'main'): Dish => ({ id, name: id, course, suitableFor });

describe('menuCoverage', () => {
  it('does not require groups with 0 members', () => {
    const cells = computeMenuCoverage([makeGuest()], [dish('a', ['vegan'])]);
    expect(cells).toEqual([]);
  });

  it('counts a vegan dish for vegetarians, not vice versa', () => {
    const guests = [makeGuest({ dietary: ['vegetarian'] }), makeGuest({ id: 'g_2', dietary: ['vegan'] })];
    const cells = computeMenuCoverage(guests, [dish('v1', ['vegan']), dish('v2', ['vegan']), dish('veg', ['vegetarian'])]);
    expect(cells.find((c) => c.group === 'vegetarian')).toMatchObject({ dishes: 3, ok: true });
    expect(cells.find((c) => c.group === 'vegan')).toMatchObject({ dishes: 2, ok: true });
    const vegOnly = computeMenuCoverage(guests, [dish('veg', ['vegetarian']), dish('veg2', ['vegetarian'])]);
    expect(vegOnly.find((c) => c.group === 'vegan')).toMatchObject({ dishes: 0, ok: false });
  });

  it('treats jain dishes as vegetarian but not vegetarian dishes as jain', () => {
    expect(dishSatisfies({ suitableFor: ['jain'] }).has('vegetarian')).toBe(true);
    const guests = [makeGuest({ dietary: ['jain'] })];
    expect(computeMenuCoverage(guests, [dish('a', ['vegetarian']), dish('b', ['vegetarian'])])[0]).toMatchObject({ group: 'jain', ok: false });
  });

  it('keeps diabetic_friendly independent and only counts mains', () => {
    const guests = [makeGuest({ dietary: ['diabetic_friendly', 'vegetarian', 'other'] })];
    const cells = computeMenuCoverage(guests, [dish('a', ['vegetarian']), dish('b', ['vegan']), dish('c', ['diabetic_friendly'], 'dessert')]);
    expect(cells.find((c) => c.group === 'diabetic_friendly')).toMatchObject({ dishes: 0, ok: false });
    expect(cells.find((c) => c.group === 'vegetarian')?.ok).toBe(true);
    expect(cells.find((c) => c.group === 'other')).toBeUndefined();
    expect(cells[0]?.ok).toBe(false); // gaps first
  });
});

describe('seating', () => {
  const seniors = Array.from({ length: 10 }, (_, i) => makeGuest({ id: `s${i}`, ageBand: 'senior' }));

  it('places wheelchair users in the step-free zone, ahead of age', () => {
    const zones = computeSeating([makeGuest({ id: 'w', ageBand: 'senior', mobility: 'wheelchair' }), ...seniors], 8);
    expect(zones.find((z) => z.id === 'step_free')?.guestIds).toEqual(['w']);
    expect(zones.find((z) => z.id === 'quiet')?.guestIds).not.toContain('w');
  });

  it('always has an honoree table and seats the honoree and VIPs there', () => {
    expect(computeSeating([], 8)[0]).toMatchObject({ id: 'honoree', seats: 0, tables: [[]] });
    const zones = computeSeating([makeGuest({ id: 'v', role: 'vip' }), makeGuest({ id: 'h', role: 'honoree', mobility: 'wheelchair' })], 8);
    expect(zones[0]?.guestIds).toEqual(['h', 'v']);
    expect(zones[0]?.reasons.join(' ')).toMatch(/step-free/i);
  });

  it('opens a new table on overflow and never exceeds seats per table (zone capacity respected)', () => {
    const zones = computeSeating(seniors, 8);
    const quiet = zones.find((z) => z.id === 'quiet');
    expect(quiet?.tables.map((t) => t.length)).toEqual([8, 2]);
    expect(totalTables(zones)).toBe(3);
    expect(chunkTables(['a', 'b', 'c'], 0)).toEqual([['a'], ['b'], ['c']]);
  });

  it('puts children by the play area and everyone else in general seating', () => {
    const zones = computeSeating([makeGuest({ id: 'c', ageBand: 'child' }), makeGuest({ id: 'a' })], 8);
    expect(zones.find((z) => z.id === 'kids')?.guestIds).toEqual(['c']);
    expect(zones.find((z) => z.id === 'general')?.guestIds).toEqual(['a']);
  });
});

describe('needs', () => {
  const guests = [
    makeGuest({ ageBand: 'senior', mobility: 'wheelchair', dietary: ['vegetarian'] }),
    makeGuest({ id: 'g_2', ageBand: 'senior', travel: 'out_of_town', sensory: 'low_vision' }),
  ];

  it('groups guests by need, largest first, with labels', () => {
    const groups = computeNeedGroups(guests);
    expect(groups[0]).toMatchObject({ key: 'age:senior', label: 'Seniors', count: 2 });
    expect(needSummary(groups)).toMatchObject({ 'mobility:wheelchair': 1, 'travel:out_of_town': 1 });
    expect(needLabel('unknown:x')).toBe('unknown:x');
  });

  it('derives checklist triggers deterministically, including outdoor weather', () => {
    const triggers = checklistTriggers(computeNeedGroups(guests), 'outdoor');
    expect(triggers).toEqual(['age:senior', 'mobility:wheelchair', 'sensory:low_vision', 'travel:out_of_town', 'venue:outdoor']);
    expect(checklistTriggers([], 'hall')).toEqual([]);
  });
});

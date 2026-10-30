import { describe, expect, it } from 'vitest';
import { allocateBudget, lineTotal, splitByScores, summarizeBudget } from './budget';
import type { BudgetLine, PriorityWeights } from '../shared/schemas';

const INR = (amount: number) => ({ amount, currency: 'INR' });
const weights: PriorityWeights = { food: 4, comfort: 5, decor: 2, entertainment: 3, photos: 1 };
const sum = (lines: BudgetLine[], heads = 0) => lines.reduce((n, l) => n + lineTotal(l, heads), 0);

describe('budget', () => {
  it('allocation sums exactly to the total with no rounding drift', () => {
    for (const total of [1, 99, 100_003, 9_999_999, 15_000_000]) {
      expect(sum(allocateBudget(INR(total), weights, [], 50))).toBe(total);
    }
    expect(splitByScores(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(splitByScores(0, [1, 2])).toEqual([0, 0]);
  });

  it('gives a weight-0 category no estimate unless confirmed lines exist', () => {
    const noPhotos = allocateBudget(INR(1_000_000), { ...weights, photos: 0 }, [], 50);
    expect(noPhotos.some((l) => l.category === 'photos')).toBe(false);
    const confirmed: BudgetLine = { id: 'p', category: 'photos', label: 'Photographer', amount: INR(50_000), source: 'confirmed', perGuest: false };
    const withConfirmed = allocateBudget(INR(1_000_000), { ...weights, photos: 0 }, [confirmed], 50);
    expect(withConfirmed.filter((l) => l.category === 'photos')).toEqual([confirmed]);
  });

  it('never overwrites quote or confirmed lines on re-allocation, and replaces old estimates', () => {
    const quote: BudgetLine = { id: 'q', category: 'food', label: 'Caterer', amount: INR(200), source: 'quote', perGuest: true };
    const oldEstimate: BudgetLine = { id: 'old', category: 'decor', label: 'Old', amount: INR(5), source: 'estimate', perGuest: false };
    const lines = allocateBudget(INR(100_000), weights, [quote, oldEstimate], 10);
    expect(lines).toContainEqual(quote);
    expect(lines.find((l) => l.id === 'old')).toBeUndefined();
    expect(sum(lines, 10)).toBe(100_000);
    expect(lines.filter((l) => l.source !== 'quote').every((l) => l.source === 'estimate')).toBe(true);
  });

  it('puts everything in unallocated when all weights are 0, and clamps when locked lines exceed total', () => {
    const zero = allocateBudget(INR(1000), { food: 0, comfort: 0, decor: 0, entertainment: 0, photos: 0 }, [], 1);
    expect(zero).toEqual([expect.objectContaining({ category: 'misc', label: 'Unallocated', amount: INR(1000) })]);
    const big: BudgetLine = { id: 'v', category: 'venue', label: 'Hall', amount: INR(5000), source: 'confirmed', perGuest: false };
    expect(allocateBudget(INR(1000), weights, [big], 1)).toEqual([big]);
  });

  it('scales per-guest lines with expected headcount (rounded up)', () => {
    const food: BudgetLine = { id: 'f', category: 'food', label: 'Food', amount: INR(900), source: 'estimate', perGuest: true };
    expect(lineTotal(food, 10.5)).toBe(9900);
    expect(lineTotal(food, -3)).toBe(0);
    const summary = summarizeBudget(INR(20_000), [food], 10);
    expect(summary.allocated.amount).toBe(9000);
    expect(summary.remaining.amount).toBe(11_000);
    expect(summary.perGuest.amount).toBe(900);
    expect(summary.byCategory.food).toEqual({ amount: INR(9000), sources: ['estimate'] });
  });

  it('reports negative remaining when over budget and zero per-guest with no guests', () => {
    const line: BudgetLine = { id: 'x', category: 'misc', label: 'X', amount: INR(500), source: 'quote', perGuest: false };
    const summary = summarizeBudget(INR(100), [line, { ...line, id: 'y', source: 'quote' }], 0);
    expect(summary.remaining.amount).toBe(-900);
    expect(summary.perGuest.amount).toBe(0);
    expect(summary.byCategory.misc.sources).toEqual(['quote']);
  });
});

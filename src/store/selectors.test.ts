import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from './index';
import {
  memoLast,
  selectBudgetSummary,
  selectChecklistTriggers,
  selectCoverage,
  selectDoNext,
  selectEventDurationMin,
  selectHeadcount,
  selectNeedGroups,
  selectQuantities,
  selectRunSheetViolations,
  selectSchedule,
  selectSeating,
} from './selectors';

describe('selectors', () => {
  beforeEach(() => useStore.getState().deleteAllData());

  it('return empty/undefined derived data without an event', () => {
    const s = useStore.getState();
    expect(selectQuantities(s)).toEqual([]);
    expect(selectBudgetSummary(s)).toBeUndefined();
    expect(selectSchedule(s)).toBeUndefined();
    expect(selectDoNext(s)).toEqual([]);
    expect(selectRunSheetViolations(s)).toEqual([]);
    expect(selectEventDurationMin(s)).toBe(0);
  });

  it('derive the demo plan and memoize by input identity', () => {
    useStore.getState().loadDemo();
    const s = useStore.getState();
    expect(selectHeadcount(s)).toBe(selectHeadcount(useStore.getState()));
    expect(selectQuantities(s).length).toBeGreaterThan(0);
    expect(selectCoverage(s).find((c) => c.group === 'diabetic_friendly')?.ok).toBe(false);
    expect(selectSeating(s)[0]?.id).toBe('honoree');
    expect(selectBudgetSummary(s)?.total.currency).toBe('INR');
    expect(selectNeedGroups(s).length).toBeGreaterThan(5);
    expect(selectChecklistTriggers(s)).toContain('venue:outdoor');
    expect(selectSchedule(s)?.ok).toBe(true);
    expect(selectDoNext(s).length).toBeGreaterThan(0);
    expect(selectEventDurationMin(s)).toBe(240);
    expect(Array.isArray(selectRunSheetViolations(s))).toBe(true);

    const before = selectQuantities(s);
    useStore.getState().setRsvp(['g_demo002'], 'no');
    expect(selectQuantities(useStore.getState())).not.toBe(before);
  });

  it('memoLast recomputes only when an argument changes', () => {
    const fn = vi.fn((a: number[], b: number) => a.length + b);
    const m = memoLast(fn);
    const arr = [1];
    m(arr, 1);
    m(arr, 1);
    m([1], 1);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

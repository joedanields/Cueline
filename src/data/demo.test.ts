import { describe, expect, it } from 'vitest';
import { buildDemoState } from './demo';
import { PersistedStateSchema } from '../shared/schemas';

describe('demo scenario (PRD §5)', () => {
  const state = buildDemoState(new Date('2030-01-01T09:00:00Z'));
  const guests = state.guests;
  const count = (pred: (g: (typeof guests)[number]) => boolean) => guests.filter(pred).length;

  it('is a valid persisted state', () => {
    expect(PersistedStateSchema.safeParse(state).success).toBe(true);
  });

  it('matches the guest mix from the PRD', () => {
    expect(guests).toHaveLength(62);
    expect(count((g) => g.ageBand === 'senior')).toBe(11);
    expect(count((g) => g.mobility === 'wheelchair')).toBe(2);
    expect(count((g) => g.ageBand === 'child')).toBe(9);
    expect(count((g) => g.dietary.includes('vegetarian'))).toBe(14);
    expect(count((g) => g.dietary.includes('diabetic_friendly'))).toBe(3);
    expect(count((g) => g.travel === 'out_of_town')).toBe(6);
    expect(state.helpers).toHaveLength(4);
    expect(new Set(guests.map((g) => g.id)).size).toBe(62);
  });

  it('is an outdoor event three weeks out with an indoor backup', () => {
    expect(state.event?.venueType).toBe('outdoor');
    expect(state.event?.notes).toMatch(/backup/i);
    expect(new Date(state.event?.startsAt ?? '').getTime()).toBeGreaterThan(
      Date.parse('2030-01-21T00:00:00Z'),
    );
  });

  it('only references existing tasks and segments', () => {
    const taskIds = new Set(state.tasks.map((t) => t.id));
    for (const t of state.tasks) for (const dep of t.dependsOn) expect(taskIds.has(dep)).toBe(true);
    const segIds = new Set(state.runSheet?.segments.map((s) => s.id));
    for (const c of state.runSheet?.constraints ?? []) expect(segIds.has(c.segmentId)).toBe(true);
  });
});

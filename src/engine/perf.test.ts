import { describe, expect, it } from 'vitest';
import { buildDemoState } from '../data/demo';
import { computeHeadcount, plannedGuests } from './rsvp';
import { computeQuantities } from './quantities';
import { computeMenuCoverage } from './menuCoverage';
import { computeSeating } from './seating';
import { allocateBudget, summarizeBudget } from './budget';
import { computeNeedGroups } from './needs';
import { scheduleTasks } from './schedule';
import type { AgeBand, Guest } from '../shared/schemas';

const BANDS: AgeBand[] = ['infant', 'child', 'teen', 'adult', 'senior'];
const BUDGET_MS = 50;

describe('engine performance (ARCHITECTURE §6)', () => {
  it('recomputes everything for 200 guests in under 50 ms', () => {
    const demo = buildDemoState(new Date('2030-01-01T09:00:00Z'));
    const event = demo.event;
    if (!event) throw new Error('demo has an event');
    const base = demo.guests[0] as Guest;
    const guests: Guest[] = Array.from({ length: 200 }, (_, i) => ({
      ...base, id: `g_${i}`, ageBand: BANDS[i % BANDS.length] ?? 'adult', rsvp: i % 4 === 0 ? 'maybe' : 'yes',
      dietary: i % 3 === 0 ? ['vegetarian'] : [], mobility: i % 25 === 0 ? 'wheelchair' : 'none',
    }));

    const recomputeAll = () => {
      const head = computeHeadcount(guests, 0.5);
      const planned = plannedGuests(guests);
      computeQuantities({ byBand: head.byBand, event });
      computeMenuCoverage(planned, demo.menu);
      computeSeating(planned, 8);
      computeNeedGroups(planned);
      const lines = allocateBudget(event.budget, event.weights, demo.budget, head.expected);
      summarizeBudget(event.budget, lines, head.expected);
      scheduleTasks(demo.tasks, event.startsAt, new Date('2030-01-01T09:00:00Z'));
    };
    recomputeAll(); // warm-up: module JIT is not part of a user-visible recompute
    const t0 = performance.now();
    recomputeAll();
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(BUDGET_MS);
  });
});

import { describe, expect, it } from 'vitest';
import { adultEquivalents, computeQuantities, eventHours } from './quantities';
import { attendanceWeight, computeHeadcount, plannedGuests } from './rsvp';
import { makeGuest } from '../../tests/fixtures/state';
import type { AgeBand, CelebrationEvent } from '../shared/schemas';

const bands = (b: Partial<Record<AgeBand, number>>) => ({ infant: 0, child: 0, teen: 0, adult: 0, senior: 0, ...b });
const event = (o: Partial<CelebrationEvent> = {}) => ({
  mealTypes: ['lunch', 'snacks', 'dessert', 'drinks'] as CelebrationEvent['mealTypes'],
  venueType: 'hall' as const,
  startsAt: '2030-06-01T12:00:00Z',
  endsAt: '2030-06-01T16:00:00Z',
  ...o,
});
const find = (lines: ReturnType<typeof computeQuantities>, item: string) => lines.find((l) => l.item === item);

describe('rsvp headcount', () => {
  it('counts maybe RSVPs at maybeProbability and declines at zero', () => {
    const guests = [makeGuest({ rsvp: 'yes' }), makeGuest({ id: 'g_2', rsvp: 'maybe' }), makeGuest({ id: 'g_3', rsvp: 'no' })];
    const h = computeHeadcount(guests, 0.25);
    expect(h.confirmed).toBe(1);
    expect(h.expected).toBe(1.25);
    expect(h.byStatus).toEqual({ invited: 0, yes: 1, no: 1, maybe: 1 });
    expect(attendanceWeight('invited', 0.3)).toBe(1);
  });

  it('excludes declined guests from planning', () => {
    expect(plannedGuests([makeGuest({ rsvp: 'no' }), makeGuest({ id: 'g_2' })])).toHaveLength(1);
  });
});

describe('quantities', () => {
  it('returns zeros with no NaN for zero guests', () => {
    const lines = computeQuantities({ byBand: bands({}), event: event() });
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) {
      expect(l.amount).toBe(0);
      expect(Number.isNaN(l.amount)).toBe(false);
    }
  });

  it('gives infants 0 and children half an adult portion', () => {
    expect(adultEquivalents(bands({ infant: 10 }))).toBe(0);
    expect(adultEquivalents(bands({ child: 4 }))).toBe(2);
    expect(adultEquivalents(bands({ senior: 10 }))).toBe(8);
  });

  it('counts maybe RSVPs at maybeProbability through the headcount', () => {
    const guests = [makeGuest(), makeGuest({ id: 'g_2', rsvp: 'maybe' })];
    const half = computeQuantities({ byBand: computeHeadcount(guests, 0.5).byBand, event: event() });
    const full = computeQuantities({ byBand: computeHeadcount(guests, 1).byBand, event: event() });
    expect(find(half, 'Mains')?.amount).toBeLessThan(find(full, 'Mains')?.amount ?? 0);
  });

  it('adds the outdoor drinks uplift', () => {
    const indoor = find(computeQuantities({ byBand: bands({ adult: 10 }), event: event() }), 'Drinks');
    const outdoor = find(computeQuantities({ byBand: bands({ adult: 10 }), event: event({ venueType: 'outdoor' }) }), 'Drinks');
    // 10 × 0.4 × 4 × 1.1 = 17.6 L indoor; × 1.3 = 22.88 → 22.9 L outdoor
    expect(indoor?.amount).toBe(17.6);
    expect(outdoor?.amount).toBe(22.9);
    expect(outdoor?.basis).toMatch(/outdoor/);
  });

  it('applies the buffer once and always rounds up', () => {
    const lines = computeQuantities({ byBand: bands({ adult: 3 }), event: event({ mealTypes: ['lunch', 'dessert'] }) });
    // 3 × 350 g × 1.1 = 1.155 kg → 1.2 kg; dessert 3 × 1.1 = 3.3 → 4
    expect(find(lines, 'Mains')?.amount).toBe(1.2);
    expect(find(lines, 'Dessert')?.amount).toBe(4);
  });

  it('caps snack hours at 3', () => {
    const long = computeQuantities({ byBand: bands({ adult: 10 }), event: event({ mealTypes: ['snacks'], endsAt: '2030-06-01T20:00:00Z' }) });
    // 10 × 4 × 3 × 1.1 = 132
    expect(find(long, 'Snacks')?.amount).toBe(132);
  });

  it('doubles mains for lunch and dinner and omits lines for missing meals', () => {
    const lines = computeQuantities({ byBand: bands({ adult: 10 }), event: event({ mealTypes: ['lunch', 'dinner'] }) });
    expect(find(lines, 'Mains')?.amount).toBe(7.7);
    expect(find(lines, 'Snacks')).toBeUndefined();
  });

  it('replaces a computed line with a user override labelled manual', () => {
    const lines = computeQuantities({ byBand: bands({ adult: 10 }), event: event(), overrides: { Mains: 9 } });
    const mains = find(lines, 'Mains');
    expect(mains).toMatchObject({ amount: 9, manual: true });
    expect(mains?.basis).toMatch(/set by you/i);
    expect(find(lines, 'Snacks')?.manual).toBe(false);
  });

  it('treats invalid or reversed times as zero hours', () => {
    expect(eventHours({ startsAt: '2030-06-01T16:00:00Z', endsAt: '2030-06-01T12:00:00Z' })).toBe(0);
    expect(eventHours({ startsAt: 'bad', endsAt: 'bad' })).toBe(0);
  });
});

import type { AgeBand, Guest } from '../shared/schemas';

export type Headcount = {
  /** Guests who said yes. */
  confirmed: number;
  /** Weighted expectation: yes + maybe × probability (may be fractional). */
  expected: number;
  /** Expected attendees per age band (fractional). */
  byBand: Record<AgeBand, number>;
  /** Counts per RSVP status. */
  byStatus: Record<Guest['rsvp'], number>;
};

const emptyBands = (): Record<AgeBand, number> => ({
  infant: 0,
  child: 0,
  teen: 0,
  adult: 0,
  senior: 0,
});

/**
 * Probability that a guest attends given their RSVP. "Invited" (no reply yet) is planned as
 * attending — organizers cater for everyone invited until they decline.
 * @example attendanceWeight('maybe', 0.5) // 0.5
 */
export function attendanceWeight(rsvp: Guest['rsvp'], maybeProbability: number): number {
  if (rsvp === 'yes' || rsvp === 'invited') return 1;
  if (rsvp === 'maybe') return maybeProbability;
  return 0;
}

/**
 * Confirmed and expected headcount.
 * @example computeHeadcount([{...g, rsvp: 'yes'}, {...g, rsvp: 'maybe'}], 0.5).expected // 1.5
 */
export function computeHeadcount(guests: Guest[], maybeProbability: number): Headcount {
  const byBand = emptyBands();
  const byStatus = { invited: 0, yes: 0, no: 0, maybe: 0 };
  let expected = 0;
  for (const g of guests) {
    const w = attendanceWeight(g.rsvp, maybeProbability);
    byBand[g.ageBand] += w;
    byStatus[g.rsvp] += 1;
    expected += w;
  }
  return { confirmed: byStatus.yes, expected, byBand, byStatus };
}

/**
 * Guests planned for in seating, coverage and checklists: everyone except those who declined.
 * @example plannedGuests(guests).every((g) => g.rsvp !== 'no') // true
 */
export function plannedGuests(guests: Guest[]): Guest[] {
  return guests.filter((g) => g.rsvp !== 'no');
}

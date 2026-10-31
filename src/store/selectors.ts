import { computeHeadcount, plannedGuests } from '../engine/rsvp';
import { computeQuantities } from '../engine/quantities';
import { computeMenuCoverage } from '../engine/menuCoverage';
import { computeSeating } from '../engine/seating';
import { summarizeBudget } from '../engine/budget';
import { scheduleTasks } from '../engine/schedule';
import { doNext } from '../engine/doNext';
import { validateRunSheet } from '../engine/runSheet';
import { checklistTriggers, computeNeedGroups } from '../engine/needs';
import { SEATS_PER_TABLE } from '../engine/constants';
import type { StoreState } from './types';

/**
 * Memoize on argument identity (last call only). Store slices are immutable, so identity
 * equality means "unchanged" and derived data is recomputed only when its inputs change.
 */
export function memoLast<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let lastArgs: A | undefined;
  let last: R;
  return (...args: A) => {
    if (
      lastArgs &&
      args.length === lastArgs.length &&
      args.every((a, i) => Object.is(a, lastArgs?.[i]))
    )
      return last;
    lastArgs = args;
    last = fn(...args);
    return last;
  };
}

const MINUTES_PER_MS = 1 / 60_000;

const headcountMemo = memoLast(computeHeadcount);
const plannedMemo = memoLast(plannedGuests);
const quantitiesMemo = memoLast(
  (
    byBand: ReturnType<typeof computeHeadcount>['byBand'],
    event: NonNullable<StoreState['event']>,
    overrides: Record<string, number>,
  ) => computeQuantities({ byBand, event, overrides }),
);
const coverageMemo = memoLast(computeMenuCoverage);
const seatingMemo = memoLast(computeSeating);
const budgetMemo = memoLast(summarizeBudget);
const needGroupsMemo = memoLast(computeNeedGroups);
const triggersMemo = memoLast(checklistTriggers);
const scheduleMemo = memoLast((tasks: StoreState['tasks'], startsAt: string, today: string) =>
  scheduleTasks(tasks, startsAt, new Date(today)),
);
const doNextMemo = memoLast(doNext);
const violationsMemo = memoLast(validateRunSheet);
const EMPTY: never[] = [];

export const selectHeadcount = (s: StoreState) => headcountMemo(s.guests, s.maybeProbability);
export const selectPlannedGuests = (s: StoreState) => plannedMemo(s.guests);
export const selectQuantities = (s: StoreState) =>
  s.event ? quantitiesMemo(selectHeadcount(s).byBand, s.event, s.quantityOverrides) : EMPTY;
export const selectCoverage = (s: StoreState) => coverageMemo(selectPlannedGuests(s), s.menu);
export const selectSeating = (s: StoreState) =>
  seatingMemo(selectPlannedGuests(s), SEATS_PER_TABLE);
export const selectBudgetSummary = (s: StoreState) =>
  s.event ? budgetMemo(s.event.budget, s.budget, selectHeadcount(s).expected) : undefined;
export const selectNeedGroups = (s: StoreState) => needGroupsMemo(selectPlannedGuests(s));
export const selectChecklistTriggers = (s: StoreState) =>
  triggersMemo(selectNeedGroups(s), s.event?.venueType);

/** Today as a stable key so the schedule recomputes at most once per day (or on change). */
const todayKey = () => new Date().toDateString();

export const selectSchedule = (s: StoreState) =>
  s.event ? scheduleMemo(s.tasks, s.event.startsAt, todayKey()) : undefined;
export const selectDoNext = (s: StoreState) => {
  const schedule = selectSchedule(s);
  return schedule?.ok ? doNextMemo(schedule.tasks) : EMPTY;
};
export const selectEventDurationMin = (s: StoreState) =>
  s.event
    ? Math.round((Date.parse(s.event.endsAt) - Date.parse(s.event.startsAt)) * MINUTES_PER_MS)
    : 0;
export const selectRunSheetViolations = (s: StoreState) =>
  s.runSheet ? violationsMemo(s.runSheet, selectEventDurationMin(s)) : EMPTY;

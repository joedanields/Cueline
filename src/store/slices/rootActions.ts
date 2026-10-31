import type { CelebrationEvent } from '../../shared/schemas';
import { emptyPersistedState } from '../../shared/schemas';
import { buildDemoState } from '../../data/demo';
import { cacheClear } from '../../ai/cache';
import { allocateBudget } from '../../engine/budget';
import { computeHeadcount } from '../../engine/rsvp';
import type { RootActions, SliceCreator, StoreState } from '../types';

/** The split only needs redoing when the total, currency or priority weights change. */
const budgetInputsChanged = (prev: CelebrationEvent | undefined, next: CelebrationEvent) =>
  !prev ||
  prev.budget.amount !== next.budget.amount ||
  prev.budget.currency !== next.budget.currency ||
  JSON.stringify(prev.weights) !== JSON.stringify(next.weights);

/** Estimate lines re-split for `event`; quotes and confirmed costs are kept by the engine. */
const reallocated = (s: StoreState, event: CelebrationEvent) =>
  allocateBudget(
    event.budget,
    event.weights,
    s.budget,
    computeHeadcount(s.guests, s.maybeProbability).expected,
  );

/** Actions that span slices: confirming the event, demo data, and wiping everything. */
export const createRootActions: SliceCreator<RootActions> = (set, get, api) => ({
  confirmEvent: (event) => {
    const s = get();
    const redo = budgetInputsChanged(s.event, event) || s.budget.length === 0;
    set({ event, budget: redo ? reallocated(s, event) : s.budget });
    get().snapshot('Event details confirmed');
  },
  reallocateBudget: () => {
    const s = get();
    if (s.event) set({ budget: reallocated(s, s.event) });
  },
  replaceState: (state) => set({ ...emptyPersistedState(), ...state, changeLog: [] }),
  loadDemo: () => {
    get().replaceState(buildDemoState(new Date()));
    get().snapshot('Loaded demo: Grandpa’s 75th');
  },
  deleteAllData: () => {
    set({
      ...emptyPersistedState(),
      event: undefined,
      runSheet: undefined,
      versions: [],
      changeLog: [],
    });
    api.persist.clearStorage();
    cacheClear(); // AI responses in memory and sessionStorage
  },
});

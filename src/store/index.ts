import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { emptyPersistedState, SCHEMA_VERSION } from '../shared/schemas';
import { buildDemoState } from '../data/demo';
import { cacheClear } from '../ai/cache';
import { allocateBudget } from '../engine/budget';
import { computeHeadcount } from '../engine/rsvp';
import { useToastStore } from './toastStore';
import {
  CORRUPT_MESSAGE,
  STORAGE_KEY,
  mergePersisted,
  pickPersisted,
  safeStorage,
} from './persistence';
import type { StoreState } from './types';
import { createPlanSlice } from './slices/planSlice';
import { createGuestSlice } from './slices/guestSlice';
import { createBudgetSlice } from './slices/budgetSlice';
import { createVendorSlice } from './slices/vendorSlice';
import { createHelperSlice } from './slices/helperSlice';
import { createTaskSlice } from './slices/taskSlice';
import { createRunSheetSlice } from './slices/runSheetSlice';
import { createChecklistSlice } from './slices/checklistSlice';
import { createVersionSlice } from './slices/versionSlice';

const notifyCorrupt = () => useToastStore.getState().pushToast(CORRUPT_MESSAGE, 'warning');

export const useStore = create<StoreState>()(
  persist(
    (set, get, api) => ({
      ...createPlanSlice(set, get, api),
      ...createGuestSlice(set, get, api),
      ...createBudgetSlice(set, get, api),
      ...createVendorSlice(set, get, api),
      ...createHelperSlice(set, get, api),
      ...createTaskSlice(set, get, api),
      ...createRunSheetSlice(set, get, api),
      ...createChecklistSlice(set, get, api),
      ...createVersionSlice(set, get, api),
      confirmEvent: (event) => {
        const { event: prev, budget, guests, maybeProbability } = get();
        const changed =
          !prev ||
          prev.budget.amount !== event.budget.amount ||
          prev.budget.currency !== event.budget.currency ||
          JSON.stringify(prev.weights) !== JSON.stringify(event.weights);
        const expected = computeHeadcount(guests, maybeProbability).expected;
        set({
          event,
          budget:
            changed || budget.length === 0
              ? allocateBudget(event.budget, event.weights, budget, expected)
              : budget,
        });
        get().snapshot('Event details confirmed');
      },
      reallocateBudget: () => {
        const { event, budget, guests, maybeProbability } = get();
        if (!event) return;
        set({
          budget: allocateBudget(
            event.budget,
            event.weights,
            budget,
            computeHeadcount(guests, maybeProbability).expected,
          ),
        });
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
        useStore.persist.clearStorage();
        cacheClear(); // AI responses in memory and sessionStorage
      },
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: safeStorage,
      partialize: (s) => ({ ...pickPersisted(s), versions: s.versions }),
      // Only one schema version exists; anything else fails validation in merge and resets.
      migrate: (persisted) => persisted,
      merge: (persisted, current) => mergePersisted(persisted, current, notifyCorrupt),
    },
  ),
);

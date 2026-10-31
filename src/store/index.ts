import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SCHEMA_VERSION } from '../shared/schemas';
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
import { createRootActions } from './slices/rootActions';

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
      ...createRootActions(set, get, api),
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

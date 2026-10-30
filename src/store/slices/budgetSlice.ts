import type { BudgetSlice, SliceCreator } from '../types';
import { upsertById } from './upsert';

export const createBudgetSlice: SliceCreator<BudgetSlice> = (set) => ({
  budget: [],
  setBudget: (budget) => set({ budget }),
  upsertBudgetLine: (line) => set((s) => ({ budget: upsertById(s.budget, line) })),
  removeBudgetLine: (id) => set((s) => ({ budget: s.budget.filter((l) => l.id !== id) })),
});
